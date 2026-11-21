package com.quiree.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Custom plugins must be registered before the bridge starts.
        registerPlugin(QrWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        openFromWidget(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openFromWidget(intent);
    }

    /** When launched from the home-screen widget, open the page it points to (a path on our own site only). */
    private void openFromWidget(Intent intent) {
        if (intent == null || getBridge() == null) return;
        String path = intent.getStringExtra(QrWidgetProvider.EXTRA_OPEN_PATH);
        if (path == null || !path.startsWith("/") || path.startsWith("//")) return;
        intent.removeExtra(QrWidgetProvider.EXTRA_OPEN_PATH);
        String base = getBridge().getAppUrl();
        if (base == null) return;
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        getBridge().getWebView().loadUrl(base + path);
    }
}
