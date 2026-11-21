package com.quiree.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import java.util.EnumMap;
import java.util.Map;

/**
 * Home-screen widget that shows the chosen Quiree QR code (drawn on the device, so it works offline).
 * Tapping it opens the app at the page the web app chose (e.g. the full-screen QR page).
 */
public class QrWidgetProvider extends AppWidgetProvider {
    public static final String EXTRA_OPEN_PATH = "com.quiree.app.OPEN_PATH";
    private static final int QR_DARK = Color.parseColor("#30243D");
    private static final int QR_SIZE_PX = 600;

    /** Redraws every placed Quiree widget (called after the web app changes the QR). */
    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, QrWidgetProvider.class));
        for (int id : ids) render(context, manager, id);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) render(context, manager, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        render(context, manager, appWidgetId);
    }

    private static void render(Context context, AppWidgetManager manager, int appWidgetId) {
        QrWidgetStore.Content content = QrWidgetStore.load(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qr);

        Bitmap qr = content.url == null ? null : encode(content.url);
        if (qr == null) {
            views.setViewVisibility(R.id.widget_qr_image, View.GONE);
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_empty_title));
        } else {
            views.setViewVisibility(R.id.widget_empty, View.GONE);
            views.setViewVisibility(R.id.widget_qr_image, View.VISIBLE);
            views.setImageViewBitmap(R.id.widget_qr_image, qr);
            views.setContentDescription(R.id.widget_qr_image, context.getString(R.string.widget_qr_description, safe(content.title)));
            views.setTextViewText(R.id.widget_title, safe(content.title));
        }

        // Tap → open the app (at the chosen page when there is one).
        Intent open = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (content.openPath != null) open.putExtra(EXTRA_OPEN_PATH, content.openPath);
        PendingIntent pending = PendingIntent.getActivity(context, appWidgetId, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        manager.updateAppWidget(appWidgetId, views);
    }

    /** Draws the QR with high error correction and a slim quiet zone; returns null if the text can't be encoded. */
    static Bitmap encode(String text) {
        try {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 1);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            BitMatrix matrix = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, QR_SIZE_PX, QR_SIZE_PX, hints);
            int w = matrix.getWidth();
            int h = matrix.getHeight();
            int[] pixels = new int[w * h];
            for (int y = 0; y < h; y++) {
                int row = y * w;
                for (int x = 0; x < w; x++) pixels[row + x] = matrix.get(x, y) ? QR_DARK : Color.WHITE;
            }
            return Bitmap.createBitmap(pixels, w, h, Bitmap.Config.ARGB_8888);
        } catch (WriterException | IllegalArgumentException e) {
            return null;
        }
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
