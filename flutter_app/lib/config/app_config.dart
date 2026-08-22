class AppConfig {
  static const String appName = "Charlie's CRM";
  static const String appVersion = '1.0.0';
  static const int buildNumber = 1;

  // Production Railway Backend URL
  static const String productionBaseUrl = 'https://iconicsmartcrm.up.railway.app';
  static const String localBaseUrl = 'http://10.0.2.2:7000'; // Android emulator localhost alias

  // Default Active Base URL
  static String get baseUrl => productionBaseUrl;

  // API Timeout (bounded)
  static const Duration apiTimeout = Duration(seconds: 15);
  static const Duration validationTimeout = Duration(seconds: 10);

  // Health Endpoint
  static String get healthUrl => '$baseUrl/api/health';
}
