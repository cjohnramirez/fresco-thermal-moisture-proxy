#include <Arduino.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <math.h>
#include <string.h>

#include "TemperatureConfig.h"

struct TemperatureBus {
  const char* id;
  uint8_t pin;
  OneWire oneWire;
  DallasTemperature thermometer;

  TemperatureBus(const char* sensorId, uint8_t dataPin)
      : id(sensorId), pin(dataPin), oneWire(dataPin), thermometer(&oneWire) {}
};

struct TemperatureReading {
  const char* status;
  float celsius;
  int deviceCount;
};

TemperatureBus buses[] = {
    {"control", 5},
    {"surface", 4},
    {"roots", 16},
    {"bottom", 17},
};

constexpr size_t TEMPERATURE_BUS_COUNT = sizeof(buses) / sizeof(buses[0]);

// Latest sample, rebuilt each interval and uploaded to Supabase.
String latestSample = "{}";

unsigned long lastSampleMs = 0;
unsigned long lastPostMs = 0;
unsigned long sequenceNumber = 0;

// Total sensors detected in the latest sample. Uploads are skipped when this is
// zero so a board with no probes attached never writes null-only rows.
int latestSensorCount = 0;

void appendNullableFloat(String& out, float value, unsigned int decimals = 2) {
  if (isnan(value)) {
    out += "null";
    return;
  }

  out += String(value, decimals);
}

const char* overallStatus(const TemperatureReading readings[]) {
  size_t bootCount = 0;
  size_t okCount = 0;
  size_t missingCount = 0;

  for (size_t i = 0; i < TEMPERATURE_BUS_COUNT; i++) {
    if (strcmp(readings[i].status, "boot") == 0) {
      bootCount++;
    } else if (strcmp(readings[i].status, "ok") == 0) {
      okCount++;
    } else if (strcmp(readings[i].status, "no_sensor") == 0) {
      missingCount++;
    }
  }

  if (bootCount == TEMPERATURE_BUS_COUNT) {
    return "boot";
  }

  if (okCount == TEMPERATURE_BUS_COUNT) {
    return "ok";
  }

  if (okCount > 0) {
    return "partial";
  }

  if (missingCount == TEMPERATURE_BUS_COUNT) {
    return "no_sensor";
  }

  return "read_failed";
}

int totalDeviceCount(const TemperatureReading readings[]) {
  int total = 0;

  for (size_t i = 0; i < TEMPERATURE_BUS_COUNT; i++) {
    total += readings[i].deviceCount > 0 ? readings[i].deviceCount : 0;
  }

  return total;
}

String buildSampleJson(const TemperatureReading readings[]) {
  const char* status = overallStatus(readings);

  String out;
  out.reserve(512);

  out += "{\"type\":\"temperature\",\"seq\":";
  out += sequenceNumber++;
  out += ",\"ms\":";
  out += millis();
  out += ",\"sensors\":";
  out += totalDeviceCount(readings);
  out += ",\"ts\":\"";
  out += status;
  out += "\",\"channels\":[";

  for (size_t i = 0; i < TEMPERATURE_BUS_COUNT; i++) {
    const float celsius = readings[i].celsius;
    const float fahrenheit = isnan(celsius) ? NAN : DallasTemperature::toFahrenheit(celsius);

    if (i > 0) {
      out += ',';
    }

    out += "{\"id\":\"";
    out += buses[i].id;
    out += "\",\"pin\":";
    out += (int)buses[i].pin;
    out += ",\"devices\":";
    out += readings[i].deviceCount;
    out += ",\"ts\":\"";
    out += readings[i].status;
    out += "\",\"tc\":";
    appendNullableFloat(out, celsius);
    out += ",\"tf\":";
    appendNullableFloat(out, fahrenheit);
    out += '}';
  }

  out += "]}";
  return out;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi \"");
  Serial.print(WIFI_SSID);
  Serial.print("\"");

  const unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000UL) {
    delay(500);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(" connected, IP ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" failed (will retry on next upload).");
  }
}

// POSTs the latest sample to Supabase as a single jsonb "payload" column.
void uploadSample() {
  if (latestSensorCount <= 0) {
    Serial.println("Skipping upload: no sensors detected.");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Skipping upload: Wi-Fi not connected.");
    return;
  }

  WiFiClientSecure client;
  // Skips TLS certificate validation. Simple and fine for a prototype; pin the
  // Supabase root CA here instead if you need verified connections.
  client.setInsecure();

  HTTPClient http;
  const String url = String(SUPABASE_URL) + "/rest/v1/" + SUPABASE_TABLE;

  if (!http.begin(client, url)) {
    Serial.println("Upload failed: http.begin() returned false.");
    return;
  }

  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  const String body = String("{\"payload\":") + latestSample + "}";
  const int code = http.POST(body);

  if (code > 0) {
    Serial.print("Supabase POST -> ");
    Serial.println(code);
    if (code >= 400) {
      Serial.println(http.getString());
    }
  } else {
    Serial.print("Supabase POST failed: ");
    Serial.println(http.errorToString(code));
  }

  http.end();
}

void sampleSensors() {
  TemperatureReading readings[TEMPERATURE_BUS_COUNT];
  bool requestedAnyConversion = false;

  for (size_t i = 0; i < TEMPERATURE_BUS_COUNT; i++) {
    int deviceCount = buses[i].thermometer.getDeviceCount();
    if (deviceCount <= 0) {
      buses[i].thermometer.begin();
      deviceCount = buses[i].thermometer.getDeviceCount();
    }

    readings[i] = {deviceCount <= 0 ? "no_sensor" : "waiting", NAN, deviceCount};

    if (deviceCount > 0) {
      buses[i].thermometer.requestTemperatures();
      requestedAnyConversion = true;
    }
  }

  if (requestedAnyConversion) {
    delay(TEMPERATURE_CONVERSION_DELAY_MS);
  }

  for (size_t i = 0; i < TEMPERATURE_BUS_COUNT; i++) {
    if (readings[i].deviceCount <= 0) {
      continue;
    }

    const float celsius = buses[i].thermometer.getTempCByIndex(0);

    if (celsius == DEVICE_DISCONNECTED_C || celsius < -100.0f || celsius > 125.0f) {
      readings[i].status = "read_failed";
      readings[i].celsius = NAN;
      continue;
    }

    readings[i].status = "ok";
    readings[i].celsius = celsius;
  }

  latestSensorCount = totalDeviceCount(readings);
  latestSample = buildSampleJson(readings);
}

void setup() {
  Serial.begin(TEMPERATURE_BAUD_RATE);
  delay(250);

  for (size_t i = 0; i < TEMPERATURE_BUS_COUNT; i++) {
    pinMode(buses[i].pin, INPUT_PULLUP);
    buses[i].thermometer.begin();
    buses[i].thermometer.setResolution(TEMPERATURE_RESOLUTION_BITS);
    buses[i].thermometer.setWaitForConversion(false);
  }

  TemperatureReading readings[TEMPERATURE_BUS_COUNT];
  for (size_t i = 0; i < TEMPERATURE_BUS_COUNT; i++) {
    readings[i] = {"boot", NAN, buses[i].thermometer.getDeviceCount()};
  }
  latestSample = buildSampleJson(readings);

  connectWiFi();
}

void loop() {
  const unsigned long now = millis();

  if (now - lastSampleMs >= TEMPERATURE_SAMPLE_INTERVAL_MS) {
    lastSampleMs = now;
    sampleSensors();
  }

  if (now - lastPostMs >= SUPABASE_POST_INTERVAL_MS) {
    lastPostMs = now;
    connectWiFi();
    uploadSample();
  }
}
