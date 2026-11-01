package com.drivecast.sovereign;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

/**
 * The assistant widget's picture: the system picker (any image; a PNG keeps its transparent background), saved
 * scaled down (at most 512 px) as the widget's own file. Cancelling keeps the current picture (the Memoji at first).
 */
public class AvatarPickActivity extends Activity {

    private int wid;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        wid = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, getIntent().getIntExtra("wid", 0));
        // placing the widget succeeds even if no picture is chosen (it shows the Memoji)
        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, wid));
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*")
                .putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/png", "image/webp", "image/*"});
        try {
            startActivityForResult(i, 1);
        } catch (Exception e) {
            finish();
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        Uri u = data == null ? null : data.getData();
        if (res == RESULT_OK && u != null) {
            try {
                BitmapFactory.Options o = new BitmapFactory.Options();
                o.inJustDecodeBounds = true;
                try (InputStream in = getContentResolver().openInputStream(u)) { BitmapFactory.decodeStream(in, null, o); }
                int s = 1;
                while (Math.max(o.outWidth, o.outHeight) / (s * 2) >= 512) s *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options();
                o2.inSampleSize = s;
                Bitmap bm;
                try (InputStream in = getContentResolver().openInputStream(u)) { bm = BitmapFactory.decodeStream(in, null, o2); }
                if (bm != null) {
                    float k = Math.min(1f, 512f / Math.max(bm.getWidth(), bm.getHeight()));
                    if (k < 1f) bm = Bitmap.createScaledBitmap(bm, Math.round(bm.getWidth() * k), Math.round(bm.getHeight() * k), true);
                    try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), "assistant_avatar_" + wid + ".png"))) {
                        bm.compress(Bitmap.CompressFormat.PNG, 100, out);
                    }
                }
            } catch (Exception ignored) {
            }
        }
        Widgets.updateAll(this);
        finish();
    }
}
