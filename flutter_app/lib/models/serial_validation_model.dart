class SerialValidationRequest {
  final String materialCode;
  final String serialNumber;
  final String dealerCode;

  SerialValidationRequest({
    required this.materialCode,
    required this.serialNumber,
    required this.dealerCode,
  });

  Map<String, dynamic> toJson() => {
    'materialCode': materialCode,
    'serialNumber': serialNumber,
    'dealerCode': dealerCode,
  };
}

class SerialValidationResponse {
  final bool valid;
  final bool canProceed;
  final String statusCode;
  final String status;
  final String message;
  final String? requestId;
  final String? serialNumberMasked;

  SerialValidationResponse({
    required this.valid,
    required this.canProceed,
    required this.statusCode,
    required this.status,
    required this.message,
    this.requestId,
    this.serialNumberMasked,
  });

  factory SerialValidationResponse.fromJson(Map<String, dynamic> json) {
    return SerialValidationResponse(
      valid: json['valid'] ?? (json['statusCode'] == '0' || json['status'] == 'VALID'),
      canProceed: json['canProceed'] ?? (json['statusCode'] == '0' || json['status'] == 'VALID'),
      statusCode: json['statusCode']?.toString() ?? '0',
      status: json['status'] ?? 'UNKNOWN',
      message: json['message'] ?? '',
      requestId: json['requestId'],
      serialNumberMasked: json['serialNumberMasked'],
    );
  }
}
