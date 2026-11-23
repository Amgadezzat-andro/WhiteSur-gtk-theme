// SPDX-FileCopyrightText: 2026 Amgad Ezzat
// SPDX-License-Identifier: GPL-2.0-or-later
//
// Overview Hover Border
//
// GNOME's overview only zooms a hovered window preview and shows its title and
// close button; it draws no outline. This adds a rounded, glowing border around
// the preview while its overlay is shown. The border is a sibling of the
// preview's window container, bound to the container's allocation with a small
// gap, and copies the container's scale so it grows with GNOME's own zoom.
// Styling comes from the WhiteSur-Dark shell theme (.amgad-hover-border).
//
// It also keeps window titles clear of the dock: the window picker gets a bottom
// padding in the window view only. A theme can't do that, because the same
// .window-picker is shrunk to a small strip (15% of the screen) in the app grid,
// where a fixed padding squeezes the workspace. The padding follows the overview
// state: 0 on the desktop, full in the window view, 0 again in the app grid.

import Clutter from 'gi://Clutter';
import Graphene from 'gi://Graphene';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as WindowPreview from 'resource:///org/gnome/shell/ui/windowPreview.js';
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

// Matches GNOME's WINDOW_OVERLAY_FADE_TIME/WINDOW_SCALE_TIME so the border moves
// together with the title, close button and zoom.
const FADE_TIME = 200;

// Space between the window and the border, in px on each side.
const GAP = 6;

// Window view bottom padding, so titles sit above the dock.
const PICKER_BOTTOM_PADDING = 80;

export default class OverviewHoverBorderExtension extends Extension {
    enable() {
        this._enablePickerPadding();

        this._borders = new Set();
        this._injections = new InjectionManager();

        const ensureBorder = preview => this._ensureBorder(preview);
        const proto = WindowPreview.WindowPreview.prototype;

        this._injections.overrideMethod(proto, 'showOverlay', original => function (animate) {
            const wasShown = this._overlayShown;
            original.call(this, animate);
            if (wasShown || !this._overlayShown)
                return;

            const border = ensureBorder(this);
            border.remove_all_transitions();
            border.show();
            border.ease({
                opacity: 255,
                duration: animate ? FADE_TIME : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        });

        this._injections.overrideMethod(proto, 'hideOverlay', original => function (animate) {
            const wasShown = this._overlayShown;
            original.call(this, animate);
            const border = this._amgadHoverBorder;
            if (!wasShown || this._overlayShown || !border)
                return;

            border.remove_all_transitions();
            border.ease({
                opacity: 0,
                duration: animate ? FADE_TIME : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => border.hide(),
            });
        });
    }

    disable() {
        this._disablePickerPadding();

        this._injections.clear();
        this._injections = null;

        for (const border of [...this._borders])
            border.destroy();
        this._borders = null;
    }

    _enablePickerPadding() {
        this._controls = Main.overview._overview._controls;
        this._pickers = null;
        this._pickerPadding = -1;

        const forget = () => {
            this._pickers = null;
            this._syncPickerPadding();
        };
        this._controls._stateAdjustment.connectObject(
            'notify::value', () => this._syncPickerPadding(), this);
        Main.overview.connectObject('showing', forget, this);
        global.workspace_manager.connectObject('notify::n-workspaces', forget, this);
        this._syncPickerPadding();
    }

    _disablePickerPadding() {
        this._controls._stateAdjustment.disconnectObject(this);
        Main.overview.disconnectObject(this);
        global.workspace_manager.disconnectObject(this);
        for (const picker of this._findPickers())
            picker.set_style(null);
        this._controls = null;
        this._pickers = null;
    }

    _findPickers() {
        const pickers = [];
        const walk = actor => {
            if (actor instanceof St.Widget && actor.has_style_class_name('window-picker'))
                pickers.push(actor);
            else
                actor.get_children().forEach(walk);
        };
        walk(this._controls._workspacesDisplay);
        return pickers;
    }

    _syncPickerPadding() {
        // 0 = desktop, 1 = window view, 2 = app grid.
        const value = this._controls._stateAdjustment.value;
        const fraction = Math.max(0, Math.min(value, 2 - value, 1));
        const padding = Math.round(PICKER_BOTTOM_PADDING * fraction);

        if (!this._pickers) {
            this._pickers = this._findPickers();
            this._pickerPadding = -1;
        }
        if (padding === this._pickerPadding)
            return;

        this._pickerPadding = padding;
        for (const picker of this._pickers)
            picker.set_style(`padding-bottom: ${padding}px;`);
    }

    _ensureBorder(preview) {
        if (preview._amgadHoverBorder)
            return preview._amgadHoverBorder;

        const container = preview.window_container;
        const border = new St.Widget({
            style_class: 'amgad-hover-border',
            reactive: false,
            visible: false,
            opacity: 0,
            pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
        });

        const {X, Y, WIDTH, HEIGHT} = Clutter.BindCoordinate;
        for (const [coordinate, offset] of [[X, -GAP], [Y, -GAP], [WIDTH, 2 * GAP], [HEIGHT, 2 * GAP]])
            border.add_constraint(new Clutter.BindConstraint({source: container, coordinate, offset}));

        // Above the window, below the title and close button that GNOME added later.
        preview.insert_child_above(border, container);

        const syncScale = () => border.set_scale(container.scale_x, container.scale_y);
        container.connectObject('notify::scale-x', syncScale, border);
        syncScale();

        preview._amgadHoverBorder = border;
        this._borders.add(border);
        border.connect('destroy', () => {
            this._borders?.delete(border);
            if (preview._amgadHoverBorder === border)
                preview._amgadHoverBorder = null;
        });

        return border;
    }
}
