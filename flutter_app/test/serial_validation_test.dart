import 'package:flutter_test/flutter_test.dart';
import '../lib/models/serial_validation_model.dart';

void main() {
  group('SerialValidationResponse Test Suite', () {
    test('Parses Code 0 VALID contract response correctly', () {
      final json = {
        'valid': true,
        'canProceed': true,
        'statusCode': '0',
        'status': 'VALID',
        'message': 'Serial is valid',
        'requestId': 'REQ-12345'
      };

      final response = SerialValidationResponse.fromJson(json);

      expect(response.valid, isTrue);
      expect(response.canProceed, isTrue);
      expect(response.statusCode, equals('0'));
      expect(response.status, equals('VALID'));
      expect(response.requestId, equals('REQ-12345'));
    });

    test('Parses Code 4 DEALER_MISMATCH contract response correctly', () {
      final json = {
        'valid': false,
        'canProceed': false,
        'statusCode': '4',
        'status': 'DEALER_MISMATCH',
        'message': 'Dealer code mismatch'
      };

      final response = SerialValidationResponse.fromJson(json);

      expect(response.valid, isFalse);
      expect(response.canProceed, isFalse);
      expect(response.statusCode, equals('4'));
      expect(response.status, equals('DEALER_MISMATCH'));
    });
  });
}
