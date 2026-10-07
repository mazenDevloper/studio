package com.drivecast.sovereign;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
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
        Uri u = intent.getData();
        if (u != null && "browse".equals(u.getHost())) {
            int wid = 0;
            try { wid = Integer.parseInt(u.getPathSegments().get(0)); } catch (Exception ignored) { }
            return new BrowseFactory(getApplicationContext(), wid);
        }
        boolean channels = u != null && "channels".equals(u.getHost());
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
                card = WidgetArt.videoCard(ctx, w, h, o.optString("title"), o.optString("channel"), thumb, avatar, "الأكثر مشاهدة");
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

    /** A browsing widget's current screen: channels / reciters (round tiles), surahs (number tiles) or videos (cards). */
    static final class BrowseFactory implements RemoteViewsFactory {
        private final Context ctx;
        private final int wid;
        private JSONArray items = new JSONArray();

        BrowseFactory(Context ctx, int wid) {
            this.ctx = ctx;
            this.wid = wid;
        }

        @Override public void onCreate() { }

        @Override
        public void onDataSetChanged() {
            JSONArray it = MediaBrowser.top(ctx, wid).optJSONArray("items");
            items = it != null ? it : new JSONArray();
        }

        @Override public void onDestroy() { }

        @Override public int getCount() { return items.length(); }

        private static final int[] TILES = {R.id.tile_0, R.id.tile_1, R.id.tile_2, R.id.tile_3};

        /** A media-screen row: a section title, or up to 4 circles / 2 cards, each its own tap. */
        private RemoteViews row(JSONObject o) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_row);
            float d = ctx.getResources().getDisplayMetrics().density;
            if ("header".equals(o.optString("row"))) {
                v.setViewVisibility(R.id.row_tiles, android.view.View.GONE);
                v.setViewVisibility(R.id.row_header, android.view.View.VISIBLE);
                v.setImageViewBitmap(R.id.row_header, WidgetArt.sectionHeader(ctx, Math.round(360 * d), Math.round(46 * d), o.optString("title")));
                boolean car = !o.optString("carousel").isEmpty();
                v.setViewVisibility(R.id.row_arrows, car ? android.view.View.VISIBLE : android.view.View.GONE);
                if (car) {
                    int count = o.optInt("count");
                    int off = NativeIslandPlugin.prefs(ctx).getInt("carousel_" + wid + "_" + o.optString("carousel"), 0);
                    v.setTextViewText(R.id.row_page, Math.min(count, off + 1) + "–" + Math.min(count, off + 4) + " / " + count);
                    v.setOnClickFillInIntent(R.id.row_prev, new Intent().putExtra("kind", "page").putExtra("id", o.optString("carousel")).putExtra("delta", -4).putExtra("count", count));
                    v.setOnClickFillInIntent(R.id.row_next, new Intent().putExtra("kind", "page").putExtra("id", o.optString("carousel")).putExtra("delta", 4).putExtra("count", count));
                }
                return v;
            }
            v.setViewVisibility(R.id.row_header, android.view.View.GONE);
            v.setViewVisibility(R.id.row_arrows, android.view.View.GONE);
            v.setViewVisibility(R.id.row_tiles, android.view.View.VISIBLE);
            JSONArray it = o.optJSONArray("items");
            if (!o.optString("carousel").isEmpty() && it != null) {
                // the sliding row: the 4 from the saved position
                int off = NativeIslandPlugin.prefs(ctx).getInt("carousel_" + wid + "_" + o.optString("carousel"), 0);
                if (off >= it.length()) off = 0;
                JSONArray page = new JSONArray();
                for (int k = off; k < Math.min(it.length(), off + 4); k++) page.put(it.opt(k));
                it = page;
            }
            boolean circle = "circle".equals(o.optString("style"));
            int per = circle ? 4 : 2;
            for (int i = 0; i < 4; i++) {
                JSONObject x = it != null && i < it.length() ? it.optJSONObject(i) : null;
                if (i >= per) { v.setViewVisibility(TILES[i], android.view.View.GONE); continue; }
                v.setViewVisibility(TILES[i], android.view.View.VISIBLE);
                if (x == null) { v.setImageViewBitmap(TILES[i], WidgetArt.blank(4, circle ? 4 : 3)); continue; }
                Bitmap b;
                if (circle) {
                    int w = Math.round(100 * d), h = Math.round(w * 1.05f);
                    b = WidgetArt.channelTile(ctx, w, h, x.optString("name"), Images.get(ctx, x.optString("thumb", null), w), x.optBoolean("starred"));
                } else if ("playlist".equals(x.optString("kind"))) {
                    int w = Math.round(200 * d), h = Math.round(w * 0.6f);
                    b = WidgetArt.folderCard(ctx, w, h, x.optString("name"), x.optInt("count"), Images.get(ctx, x.optString("thumb", null), w));
                } else {
                    int w = Math.round(200 * d), h = Math.round(w * 0.6f);
                    b = WidgetArt.videoCard(ctx, w, h, x.optString("name"), x.optString("channel"), Images.get(ctx, x.optString("thumb", null), w), null, null);
                }
                v.setImageViewBitmap(TILES[i], b);
                v.setOnClickFillInIntent(TILES[i], fill(x));
            }
            return v;
        }

        private static Intent fill(JSONObject o) {
            Intent f = new Intent();
            f.putExtra("kind", o.optString("kind"));
            f.putExtra("id", o.optString("id"));
            f.putExtra("name", o.optString("name"));
            if (o.has("reciter")) f.putExtra("reciter", o.optString("reciter"));
            return f;
        }

        @Override
        public RemoteViews getViewAt(int position) {
            JSONObject o = items.optJSONObject(position);
            if (o != null && o.has("row")) return row(o);
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_folders_item);
            if (o == null) return v;
            float d = ctx.getResources().getDisplayMetrics().density;
            String kind = o.optString("kind");
            Bitmap card;
            if ("zikr".equals(kind)) {
                card = WidgetArt.zikrCard(ctx, Math.min(900, Math.round(340 * d)), o.optString("name"), o.optString("text"), o.optInt("count"), o.optInt("done"));
            } else if ("playlist".equals(kind)) {
                int w = Math.min(640, Math.round(200 * d)), h = Math.round(w * 0.6f);
                card = WidgetArt.folderCard(ctx, w, h, o.optString("name"), o.optInt("count"), Images.get(ctx, o.optString("thumb", null), w));
            } else if ("video".equals(kind)) {
                int w = Math.min(640, Math.round(200 * d)), h = Math.round(w * 0.6f);
                boolean top = o.optBoolean("badge");
                Bitmap av = top ? Images.get(ctx, o.optString("avatar", null), Math.round(h * 0.2f)) : null;
                card = WidgetArt.videoCard(ctx, w, h, o.optString("name"), o.optString("channel"), Images.get(ctx, o.optString("thumb", null), w), av, top ? "الأكثر مشاهدة" : null);
            } else if ("iptv".equals(kind)) {
                int w = Math.min(420, Math.round(130 * d)), h = Math.round(w * 1.12f);
                card = WidgetArt.iptvTile(ctx, w, h, o.optString("name"), Images.get(ctx, o.optString("image", null), w));
            } else if ("surah".equals(kind)) {
                int w = Math.min(420, Math.round(120 * d)), h = Math.round(w * 0.62f);
                card = WidgetArt.surahTile(ctx, w, h, o.optString("id"), o.optString("name"));
            } else {
                int w = Math.min(400, Math.round(110 * d)), h = Math.round(w * 1.05f);
                card = WidgetArt.channelTile(ctx, w, h, o.optString("name"), Images.get(ctx, o.optString("thumb", null), w), o.optBoolean("starred"));
            }
            v.setImageViewBitmap(R.id.folder_card, card);
            Intent fill = new Intent();
            fill.putExtra("kind", kind);
            fill.putExtra("pos", position);
            fill.putExtra("id", o.optString("id"));
            fill.putExtra("name", o.optString("name"));
            if (o.has("reciter")) fill.putExtra("reciter", o.optString("reciter"));
            v.setOnClickFillInIntent(R.id.folder_item, fill);
            return v;
        }

        @Override public RemoteViews getLoadingView() { return null; }

        @Override public int getViewTypeCount() { return 2; }

        @Override public long getItemId(int position) { return position; }

        @Override public boolean hasStableIds() { return false; }
    }
}
