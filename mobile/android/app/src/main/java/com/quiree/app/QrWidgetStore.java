package com.quiree.app;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * What the home-screen widget shows. Kept on the device so the widget works offline and after reboots.
 */
public final class QrWidgetStore {
    private static final String PREFS = "quiree_qr_widget";
    private static final String KEY_URL = "url";
    private static final String KEY_TITLE = "title";
    private static final String KEY_SUBTITLE = "subtitle";
    private static final String KEY_OPEN_PATH = "openPath";

    /** Snapshot of the stored widget content. {@code url} is null when nothing has been chosen yet. */
    public static final class Content {
        public final String url;
        public final String title;
        public final String subtitle;
        public final String openPath;

        Content(String url, String title, String subtitle, String openPath) {
            this.url = url;
            this.title = title;
            this.subtitle = subtitle;
            this.openPath = openPath;
        }
    }

    private QrWidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void save(Context context, String url, String title, String subtitle, String openPath) {
        prefs(context).edit()
            .putString(KEY_URL, url)
            .putString(KEY_TITLE, title)
            .putString(KEY_SUBTITLE, subtitle)
            .putString(KEY_OPEN_PATH, openPath)
            .apply();
    }

    public static Content load(Context context) {
        SharedPreferences p = prefs(context);
        return new Content(p.getString(KEY_URL, null), p.getString(KEY_TITLE, null),
            p.getString(KEY_SUBTITLE, null), p.getString(KEY_OPEN_PATH, null));
    }

    public static void clear(Context context) {
        prefs(context).edit().clear().apply();
    }
}
