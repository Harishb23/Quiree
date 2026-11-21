package com.quiree.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge used by the Quiree web app (inside this app only) to choose what the home-screen widget shows
 * and to ask the launcher to place the widget.
 */
@CapacitorPlugin(name = "QrWidget")
public class QrWidgetPlugin extends Plugin {
    private static final int MAX_TEXT = 120;
    private static final int MAX_URL = 500;

    /** setQr({ url, title, subtitle?, openPath? }) — stores the QR and redraws placed widgets. */
    @PluginMethod
    public void setQr(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.length() > MAX_URL || !isHttpUrl(url)) {
            call.reject("A valid http(s) QR link is required.");
            return;
        }
        String openPath = call.getString("openPath");
        // Only paths on this app's own site may be opened from the widget.
        if (openPath != null && (!openPath.startsWith("/") || openPath.startsWith("//") || openPath.length() > MAX_URL)) {
            call.reject("openPath must be a path on this site, e.g. /q/your-name.");
            return;
        }
        Context context = getContext();
        QrWidgetStore.save(context, url, trim(call.getString("title")), trim(call.getString("subtitle")), openPath);
        QrWidgetProvider.updateAll(context);

        JSObject result = new JSObject();
        result.put("placedWidgets", placedCount(context));
        call.resolve(result);
    }

    /** getQr() — what the widget currently shows and how many widgets are on the home screen. */
    @PluginMethod
    public void getQr(PluginCall call) {
        Context context = getContext();
        QrWidgetStore.Content content = QrWidgetStore.load(context);
        JSObject result = new JSObject();
        result.put("url", content.url);
        result.put("title", content.title);
        result.put("placedWidgets", placedCount(context));
        result.put("pinSupported", pinSupported(context));
        call.resolve(result);
    }

    /** requestPin() — asks the launcher to add the widget (Android 8+ launchers that support it). */
    @PluginMethod
    public void requestPin(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        if (!pinSupported(context)) {
            result.put("requested", false);
            call.resolve(result);
            return;
        }
        boolean requested = AppWidgetManager.getInstance(context)
            .requestPinAppWidget(new ComponentName(context, QrWidgetProvider.class), null, null);
        result.put("requested", requested);
        call.resolve(result);
    }

    /** clear() — e.g. on logout; the widget then asks the user to open the app. */
    @PluginMethod
    public void clear(PluginCall call) {
        Context context = getContext();
        QrWidgetStore.clear(context);
        QrWidgetProvider.updateAll(context);
        call.resolve();
    }

    private static boolean pinSupported(Context context) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported();
    }

    private static int placedCount(Context context) {
        return AppWidgetManager.getInstance(context)
            .getAppWidgetIds(new ComponentName(context, QrWidgetProvider.class)).length;
    }

    private static boolean isHttpUrl(String value) {
        Uri uri = Uri.parse(value);
        String scheme = uri.getScheme();
        return ("https".equals(scheme) || "http".equals(scheme)) && uri.getHost() != null && !uri.getHost().isEmpty();
    }

    private static String trim(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.length() > MAX_TEXT ? v.substring(0, MAX_TEXT) : v;
    }
}
