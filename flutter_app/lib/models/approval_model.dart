class ApprovalModel {
  final String id;
  final String entityType;
  final String entityId;
  final String requesterId;
  final String type;
  final double amount;
  final String reason;
  final String status;

  ApprovalModel({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.requesterId,
    required this.type,
    required this.amount,
    required this.reason,
    required this.status,
  });

  factory ApprovalModel.fromJson(Map<String, dynamic> json) {
    return ApprovalModel(
      id: json['_id'] ?? json['id'] ?? '',
      entityType: json['entityType'] ?? '',
      entityId: json['entityId'] ?? '',
      requesterId: json['requesterId'] is Map ? json['requesterId']['_id'] : json['requesterId'] ?? '',
      type: json['type'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      reason: json['reason'] ?? '',
      status: json['status'] ?? 'pending',
    );
  }
}
