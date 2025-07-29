@echo off
echo 🧪 Test OpenRouter API con curl
echo.

echo 📡 Probando API key...
curl -X GET "https://openrouter.ai/api/v1/auth/key" ^
  -H "Authorization: Bearer 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" ^
  -H "Content-Type: application/json"

echo.
echo.
echo 📡 Probando llamada simple...
curl -X POST "https://openrouter.ai/api/v1/chat/completions" ^
  -H "Authorization: Bearer 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" ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"google/gemini-flash-1.5\",\"messages\":[{\"role\":\"user\",\"content\":\"Hola\"}],\"max_tokens\":50}"

echo.
echo ✅ Test completado
pause