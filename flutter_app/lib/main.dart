import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'state/auth_provider.dart';
import 'state/serial_validation_provider.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const IconicSmartCrmApp());
}

class IconicSmartCrmApp extends StatelessWidget {
  const IconicSmartCrmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SerialValidationProvider()),
      ],
      child: MaterialApp(
        title: 'Iconic Smart CRM',
        theme: AppTheme.theme,
        home: const LoginScreen(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
