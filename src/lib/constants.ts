export const AI_ASSISTANT_API_KEY = 'AIzaSyBMmtON9ww4dJxMHrl1wKyWTvI0ipJXJws'; 
export const WEATHER_API_KEY = '7acefc26deee4904a2393917252207'; 
export const GOOGLE_MAPS_API_KEY = 'AIzaSyBRqAHJ2elbE_Z7NXXYC50XZpqi6HbG6Rk';
export const FOOTBALL_API_KEY = '2f79edc60ed7f63aa4af1feea0f1ff2c'; 
export const FOOTBALL_API_BASE_URL = 'https://v3.football.api-sports.io';

export const YT_KEYS_POOL = [
    "AIzaSyCaqMPtn-egmEQk7XmTel--xsXV1Xbdp7o", // المفتاح الأساسي المفضل
    "AIzaSyBeTHs25EsKeDFtIS5kq8iDATz-2c8hBrI",
    "AIzaSyCtgdzDMCpCbGe1vSAu0F4wBKERC77ac6I",
    "AIzaSyBYThRM6tVnzgFgdHOUAN6DN8jQd54OKeg",
    "AIzaSyDULoFJLWNIO9hn0u8siLz-BzTi7eM-CX4",
    "AIzaSyAjdVZ2Rodp6ZVEF1pZT195kAtGELolxSI",
    "AIzaSyCcB-bW1b1bSu3hzROVhSbRT-D894zHYeg"
];

// JSONBin.io Configuration - Multi-Bin Architecture
export const JSONBIN_MASTER_KEY = '$2a$10$SYrYv.ct8hiMU9YeUxEQ.ecRkOrTqs.TDchJRV3wW.aKJnDXy2oVy';
export const JSONBIN_MASTER_BIN_ID = '69b63cb1c3097a1dd5278bf4'; // Settings, Teams, Leagues
export const JSONBIN_CHANNELS_BIN_ID = '68ef1b3dd0ea881f40a38bd1'; // YouTube Channels
export const JSONBIN_SAVED_VIDEOS_BIN_ID = '68e4ac20d0ea881f4098138c'; // Saved Videos Library
export const JSONBIN_IPTV_FAVS_BIN_ID = '69a87b8bd0ea881f40eeec0c'; // IPTV Favorites
export const JSONBIN_PRAYER_TIMES_BIN_ID = '69a00f6eae596e708f4b7291'; // Global Prayer Times
export const JSONBIN_MANUSCRIPTS_BIN_ID = '69b63c5cc3097a1dd5278b25'; // Manuscripts & Azkar

export const prayerTimesData = [
    {"date":"2026-03-05","day":"الخميس","fajr":"05:27","sunrise":"06:39","dhuhr":"12:40","asr":"16:02","maghrib":"18:36","isha":"19:43"}
];

export function convertTo12Hour(time24h: string | undefined): string {
    if (!time24h || typeof time24h !== 'string' || time24h === '--:--') {
        return '--:--';
    }
    const parts = time24h.split(':');
    if (parts.length < 2) return time24h;
    
    let hours24 = parseInt(parts[0], 10);
    const minutes = parts[1];
    
    let hours12 = hours24 % 12;
    hours12 = hours12 ? hours12 : 12;
    
    return `${hours12}:${minutes}`;
}
