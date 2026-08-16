import 'package:flutter/foundation.dart';
import '../repositories/serial_validation_repository.dart';
import '../models/serial_validation_model.dart';

class SerialValidationProvider with ChangeNotifier {
  final SerialValidationRepository _repository;
  bool _isLoading = false;
  SerialValidationResponse? _lastResponse;
  String? _errorMessage;

  SerialValidationProvider({SerialValidationRepository? repository})
      : _repository = repository ?? SerialValidationRepository();

  bool get isLoading => _isLoading;
  SerialValidationResponse? get lastResponse => _lastResponse;
  String? get errorMessage => _errorMessage;

  Future<void> validate(String materialCode, String serialNumber, String dealerCode) async {
    _isLoading = true;
    _errorMessage = null;
    _lastResponse = null;
    notifyListeners();

    try {
      final req = SerialValidationRequest(
        materialCode: materialCode.trim(),
        serialNumber: serialNumber.trim(),
        dealerCode: dealerCode.trim(),
      );
      _lastResponse = await _repository.validateSerial(req);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void reset() {
    _lastResponse = null;
    _errorMessage = null;
    _isLoading = false;
    notifyListeners();
  }
}
