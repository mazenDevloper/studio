package com.drivecast.sovereign;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * The folders widget's scrolling grid: one card picture per folder (thumbnail, name, "n تلاوة") and per most-viewed
 * video of the starred channels (thumbnail, title, channel, "الأكثر مشاهدة"), like the site's dashboard row.
 * Tapping a card opens the app and plays it.
 */
public class FoldersWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        boolean channels = intent.getData() != null && "channels".equals(intent.getData().getHost());
        return new Factory(getApplicationContext(), channels);
    }

    static final class Factory implements RemoteViewsFactory {
        private final Context ctx;
        private final List<JSONObject> items = new ArrayList<>();
        /** the subscriptions widget (channel tiles) instead of the folders */
        private final boolean channels;

        Factory(Context ctx, boolean channels) {
            this.ctx = ctx;
            this.channels = channels;
        }

        @Override
        public void onCreate() {
        }

        @Override
        public void onDataSetChanged() {
            items.clear();
            if (channels) {
                // starred channels first, like the site's sidebar
                JSONArray ch = Cloud.array(ctx, "cloud_channels");
                List<JSONObject> rest = new ArrayList<>();
                for (int i = 0; i < ch.length(); i++) {
                    JSONObject o = ch.optJSONObject(i);
                    if (o == null) continue;
                    if (o.optBoolean("starred")) items.add(o); else rest.add(o);
                }
                items.addAll(rest);
                return;
            }
            JSONObject wd = Widgets.json(ctx, "widgets");
            JSONArray pl = Widgets.playlists(ctx), tv = wd.optJSONArray("topVideos");
            for (int i = 0; pl != null && i < pl.length(); i++) {
                JSONObject o = pl.optJSONObject(i);
                if (o != null) try { items.add(new JSONObject(o.toString()).put("_kind", "pl")); } catch (Exception ignored) { }
            }
            for (int i = 0; tv != null && i < tv.length(); i++) {
                JSONObject o = tv.optJSONObject(i);
                if (o != null) try { items.add(new JSONObject(o.toString()).put("_kind", "v")); } catch (Exception ignored) { }
            }
        }

        @Override
        public void onDestroy() {
            items.clear();
        }

        @Override
        public int getCount() {
            return items.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_folders_item);
            if (position < 0 || position >= items.size()) return v;
            JSONObject o = items.get(position);
            if (channels) {
                float dd = ctx.getResources().getDisplayMetrics().density;
                int cw = Math.min(400, Math.round(110 * dd)), chh = Math.round(cw * 1.05f);
                Bitmap avatar = Images.get(ctx, o.optString("image", null), cw);
                v.setImageViewBitmap(R.id.folder_card, WidgetArt.channelTile(ctx, cw, chh, o.optString("name"), avatar, o.optBoolean("starred")));
                Intent fill = new Intent();
                fill.putExtra("route", "/media");
                fill.putExtra("command", "channel");
                fill.putExtra("arg", o.optString("id"));
                v.setOnClickFillInIntent(R.id.folder_item, fill);
                return v;
            }
            // 16:10 cards at a size that stays sharp on tablets
            float d = ctx.getResources().getDisplayMetrics().density;
            int w = Math.min(640, Math.round(200 * d)), h = Math.round(w * 0.6f);
            Bitmap card;
            Bitmap thumb = Images.get(ctx, o.optString("thumb", null), w);
            boolean playlist = "pl".equals(o.optString("_kind"));
            if (playlist) {
                card = WidgetArt.folderCard(ctx, w, h, o.optString("name"), o.optInt("count"), thumb);
            } else {
                Bitmap avatar = Images.get(ctx, o.optString("avatar", null), Math.round(h * 0.2f));
                card = WidgetArt.videoCard(ctx, w, h, o.optString("title"), o.optString("channel"), thumb, avatar);
            }
            v.setImageViewBitmap(R.id.folder_card, card);
            Intent fill = new Intent();
            fill.putExtra("command", "play");
            fill.putExtra("arg", (playlist ? "pl:" : "v:") + o.optString("id"));
            v.setOnClickFillInIntent(R.id.folder_item, fill);
            return v;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            return position < items.size() ? items.get(position).optString("id").hashCode() : position;
        }

        @Override
        public boolean hasStableIds() {
            return false;
        }
    }
}
