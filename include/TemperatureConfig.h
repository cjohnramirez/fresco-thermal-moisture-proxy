#pragma once

#ifndef TEMPERATURE_BAUD_RATE
#define TEMPERATURE_BAUD_RATE 115200
#endif

#ifndef TEMPERATURE_SAMPLE_INTERVAL_MS
#define TEMPERATURE_SAMPLE_INTERVAL_MS 1000UL
#endif

#ifndef TEMPERATURE_RESOLUTION_BITS
#define TEMPERATURE_RESOLUTION_BITS 12
#endif

#ifndef TEMPERATURE_CONVERSION_DELAY_MS
#define TEMPERATURE_CONVERSION_DELAY_MS 750UL
#endif

// Wi-Fi network (must have internet access) the device joins to reach Supabase.
#ifndef WIFI_SSID
#define WIFI_SSID "FrescoGreenovation"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "CurlyLettuce"
#endif

// Supabase project REST configuration.
//   SUPABASE_URL      -> e.g. "https://abcdefgh.supabase.co" (no trailing slash)
//   SUPABASE_ANON_KEY -> the project's anon/public API key
//   SUPABASE_TABLE    -> table that receives the rows
#ifndef SUPABASE_URL
#define SUPABASE_URL "https://dfkofandnffbalkeccns.supabase.co"
#endif

#ifndef SUPABASE_ANON_KEY
#define SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma29mYW5kbmZmYmFsa2VjY25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzI5NDMsImV4cCI6MjA5ODU0ODk0M30.b_FChyavpAh36am7bO0dAqqN7775vq2xQQOYBa2QeHs"
#endif

#ifndef SUPABASE_TABLE
#define SUPABASE_TABLE "temperature_readings"
#endif

// How often to upload the latest reading to Supabase (ms). Sampling still
// happens every TEMPERATURE_SAMPLE_INTERVAL_MS; this only throttles uploads.
#ifndef SUPABASE_POST_INTERVAL_MS
#define SUPABASE_POST_INTERVAL_MS 60000UL
#endif
