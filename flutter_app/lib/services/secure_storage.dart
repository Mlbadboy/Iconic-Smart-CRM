class SecureStorageService {
  static final Map<String, String> _inMemoryStorage = {};

  static Future<void> write(String key, String value) async {
    _inMemoryStorage[key] = value;
  }

  static Future<String?> read(String key) async {
    return _inMemoryStorage[key];
  }

  static Future<void> delete(String key) async {
    _inMemoryStorage.remove(key);
  }

  static Future<void> deleteAll() async {
    _inMemoryStorage.clear();
  }
}
