2025-08-05T19:09:38.038303653Z 2025-08-05T19:09:38.038Z [warn]: 🚨 ALERTA: Métrica crítica {
2025-08-05T19:09:38.038321516Z   "metricName": "cpu_usage",
2025-08-05T19:09:38.038325413Z   "metric": {
2025-08-05T19:09:38.038328459Z     "name": "cpu_usage",
2025-08-05T19:09:38.038331615Z     "value": 100,
2025-08-05T19:09:38.038334671Z     "unit": "%",
2025-08-05T19:09:38.038337967Z     "timestamp": 1754420978036
2025-08-05T19:09:38.038341253Z   },
2025-08-05T19:09:38.038344309Z   "threshold": {
2025-08-05T19:09:38.038347675Z     "warning": 70,
2025-08-05T19:09:38.038351071Z     "critical": 90,
2025-08-05T19:09:38.038354468Z     "action": "alert"
2025-08-05T19:09:38.038358766Z   }
2025-08-05T19:09:38.038362052Z }
2025-08-05T19:09:42.433435420Z 🔐 [AuthMiddleware] Iniciando verificación de autenticación
2025-08-05T19:09:42.433463923Z 🔐 [AuthMiddleware] Ruta: /status
2025-08-05T19:09:42.433484101Z 🔐 [AuthMiddleware] Método: GET
2025-08-05T19:09:42.433566164Z 🔐 [AuthMiddleware] Headers recibidos: {
2025-08-05T19:09:42.433594446Z   authorization: 'Presente',
2025-08-05T19:09:42.433599626Z   'content-type': 'application/json',
2025-08-05T19:09:42.433634541Z   'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0',
2025-08-05T19:09:42.433640082Z   origin: 'https://dev-waprueba.aova.mx',
2025-08-05T19:09:42.433643488Z   host: 'dev-apiwaprueba.aova.mx'
2025-08-05T19:09:42.433646564Z }
2025-08-05T19:09:42.433659518Z 🔐 [AuthMiddleware] Token extraído: eyJhbGciOiJIUzI1NiIs...
2025-08-05T19:09:42.433663486Z 🔐 [AuthMiddleware] Verificando token con Supabase...
2025-08-05T19:09:42.565777556Z ✅ [AuthMiddleware] Token válido, usuario encontrado: {
2025-08-05T19:09:42.565807432Z   userId: 'a128209e-d44c-42df-b5f9-c25f7ce92c1e',
2025-08-05T19:09:42.565810778Z   email: 'k.alvarado@aova.mx'
2025-08-05T19:09:42.565813182Z }
2025-08-05T19:09:42.565815426Z 🔐 [AuthMiddleware] Obteniendo perfil de usuario...
2025-08-05T19:09:42.668584370Z ✅ [AuthMiddleware] Perfil de usuario obtenido: {
2025-08-05T19:09:42.668630677Z   userId: 'a128209e-d44c-42df-b5f9-c25f7ce92c1e',
2025-08-05T19:09:42.668636066Z   username: 'k.alvarado@aova.mx',
2025-08-05T19:09:42.668640094Z   role: 'agent',
2025-08-05T19:09:42.668643831Z   isActive: true
2025-08-05T19:09:42.668647508Z }
2025-08-05T19:09:42.668651265Z ✅ [AuthMiddleware] Autenticación exitosa, continuando...
2025-08-05T19:09:43.264851031Z ValidationError: The Express 'trust proxy' setting is true, which allows anyone to trivially bypass IP-based rate limiting. See https://express-rate-limit.github.io/ERR_ERL_PERMISSIVE_TRUST_PROXY/ for more information.
2025-08-05T19:09:43.264915591Z     at Object.trustProxy (/app/node_modules/express-rate-limit/dist/index.cjs:167:13)
2025-08-05T19:09:43.264920500Z     at wrappedValidations.<computed> [as trustProxy] (/app/node_modules/express-rate-limit/dist/index.cjs:397:22)
2025-08-05T19:09:43.264925028Z     at Object.keyGenerator (/app/node_modules/express-rate-limit/dist/index.cjs:657:20)
2025-08-05T19:09:43.264928675Z     at /app/node_modules/express-rate-limit/dist/index.cjs:710:32
2025-08-05T19:09:43.264931921Z     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
2025-08-05T19:09:43.264935328Z     at async /app/node_modules/express-rate-limit/dist/index.cjs:691:5 {
2025-08-05T19:09:43.264939005Z   code: 'ERR_ERL_PERMISSIVE_TRUST_PROXY',
2025-08-05T19:09:43.264942521Z   help: 'https://express-rate-limit.github.io/ERR_ERL_PERMISSIVE_TRUST_PROXY/'
2025-08-05T19:09:43.264945797Z }
2025-08-05T19:09:55.978586405Z {
2025-08-05T19:09:55.978636388Z   service: 'whatsapp-llm',
2025-08-05T19:09:55.978642981Z   level: 'info',
2025-08-05T19:09:55.978648229Z   message: 'User logged in successfully: k.alvarado@aova.mx',
2025-08-05T19:09:55.978653610Z   timestamp: '2025-08-05 19:09:55.978'
2025-08-05T19:09:55.978658699Z }
2025-08-05T19:10:37.445714496Z 🧹 Mensajes antiguos eliminados: 0
2025-08-05T19:10:38.038643637Z 2025-08-05T19:10:38.038Z [warn]: Métrica memory_usage excedió threshold warning: 94.24546973961999% (threshold: 80) {
2025-08-05T19:10:38.038673422Z   "metric": {
2025-08-05T19:10:38.038678462Z     "name": "memory_usage",
2025-08-05T19:10:38.038682489Z     "value": 94.24546973961999,
2025-08-05T19:10:38.038686477Z     "unit": "%",
2025-08-05T19:10:38.038690244Z     "timestamp": 1754421038037
2025-08-05T19:10:38.038694011Z   },
2025-08-05T19:10:38.038698118Z   "threshold": {
2025-08-05T19:10:38.038701855Z     "warning": 80,
2025-08-05T19:10:38.038705673Z     "critical": 95,
2025-08-05T19:10:38.038709550Z     "action": "alert"
2025-08-05T19:10:38.038713397Z   }
2025-08-05T19:10:38.038728515Z }
2025-08-05T19:10:38.038775653Z 2025-08-05T19:10:38.038Z [warn]: ⚠️ ADVERTENCIA: Threshold excedido {
2025-08-05T19:10:38.038791032Z   "metricName": "memory_usage",
2025-08-05T19:10:38.038796201Z   "metric": {
2025-08-05T19:10:38.038800409Z     "name": "memory_usage",
2025-08-05T19:10:38.038804467Z     "value": 94.24546973961999,
2025-08-05T19:10:38.038808595Z     "unit": "%",
2025-08-05T19:10:38.038812462Z     "timestamp": 1754421038037
2025-08-05T19:10:38.038832169Z   },
2025-08-05T19:10:38.038834653Z   "threshold": {
2025-08-05T19:10:38.038836897Z     "warning": 80,
2025-08-05T19:10:38.038839131Z     "critical": 95,
2025-08-05T19:10:38.038841515Z     "action": "alert"
2025-08-05T19:10:38.038843890Z   }
2025-08-05T19:10:38.038846134Z }
2025-08-05T19:10:38.038934188Z 2025-08-05T19:10:38.038Z [warn]: 🚨 ALERTA: Métrica crítica {
2025-08-05T19:10:38.038939167Z   "metricName": "memory_usage",
2025-08-05T19:10:38.038941632Z   "metric": {
2025-08-05T19:10:38.038943906Z     "name": "memory_usage",
2025-08-05T19:10:38.038946371Z     "value": 94.24546973961999,
2025-08-05T19:10:38.038948655Z     "unit": "%",
2025-08-05T19:10:38.038950869Z     "timestamp": 1754421038037
2025-08-05T19:10:38.038953134Z   },
2025-08-05T19:10:38.038955328Z   "threshold": {
2025-08-05T19:10:38.038957652Z     "warning": 80,
2025-08-05T19:10:38.038959896Z     "critical": 95,
2025-08-05T19:10:38.038962171Z     "action": "alert"
2025-08-05T19:10:38.038964465Z   }
2025-08-05T19:10:38.038967030Z }
2025-08-05T19:10:38.039056386Z 2025-08-05T19:10:38.038Z [error]: Métrica cpu_usage excedió threshold critical: 100% (threshold: 90) {
2025-08-05T19:10:38.039070603Z   "metric": {
2025-08-05T19:10:38.039074600Z     "name": "cpu_usage",
2025-08-05T19:10:38.039078127Z     "value": 100,
2025-08-05T19:10:38.039081894Z     "unit": "%",
2025-08-05T19:10:38.039085581Z     "timestamp": 1754421038038
2025-08-05T19:10:38.039089108Z   },
2025-08-05T19:10:38.039092433Z   "threshold": {
2025-08-05T19:10:38.039095679Z     "warning": 70,
2025-08-05T19:10:38.039099376Z     "critical": 90,
2025-08-05T19:10:38.039103163Z     "action": "alert"
2025-08-05T19:10:38.039106740Z   }
2025-08-05T19:10:38.039109916Z }
2025-08-05T19:10:38.039212848Z 2025-08-05T19:10:38.039Z [error]: 🚨 CRÍTICO: Threshold excedido {
2025-08-05T19:10:38.039222606Z   "metricName": "cpu_usage",
2025-08-05T19:10:38.039227074Z   "metric": {
2025-08-05T19:10:38.039230882Z     "name": "cpu_usage",
2025-08-05T19:10:38.039233446Z     "value": 100,
2025-08-05T19:10:38.039235781Z     "unit": "%",
2025-08-05T19:10:38.039238075Z     "timestamp": 1754421038038
2025-08-05T19:10:38.039240510Z   },
2025-08-05T19:10:38.039242754Z   "threshold": {
2025-08-05T19:10:38.039254947Z     "warning": 70,
2025-08-05T19:10:38.039257431Z     "critical": 90,
2025-08-05T19:10:38.039259806Z     "action": "alert"
2025-08-05T19:10:38.039262189Z   }
2025-08-05T19:10:38.039264443Z }
2025-08-05T19:10:38.039368087Z 2025-08-05T19:10:38.039Z [warn]: 🚨 ALERTA: Métrica crítica {
2025-08-05T19:10:38.039373818Z   "metricName": "cpu_usage",
2025-08-05T19:10:38.039376352Z   "metric": {
2025-08-05T19:10:38.039378797Z     "name": "cpu_usage",
2025-08-05T19:10:38.039381161Z     "value": 100,
2025-08-05T19:10:38.039383466Z     "unit": "%",
2025-08-05T19:10:38.039385740Z     "timestamp": 1754421038038
2025-08-05T19:10:38.039388114Z   },
2025-08-05T19:10:38.039390419Z   "threshold": {
2025-08-05T19:10:38.039392693Z     "warning": 70,
2025-08-05T19:10:38.039394937Z     "critical": 90,
2025-08-05T19:10:38.039397282Z     "action": "alert"
2025-08-05T19:10:38.039399606Z   }
2025-08-05T19:10:38.039401810Z }
2025-08-05T19:10:38.042866166Z 🔍 [RETRY_SERVICE] Buscando mensajes fallidos para reintentar...
2025-08-05T19:10:38.042978536Z 🔄 [PERSISTENCE] Obteniendo mensajes fallidos para retry
2025-08-05T19:10:38.105275754Z ✅ [PERSISTENCE] Mensajes fallidos encontrados: 0
2025-08-05T19:10:38.105308886Z ✅ [RETRY_SERVICE] No hay mensajes fallidos para procesar
2025-08-05T19:10:45.999847682Z 🔐 [AuthMiddleware] Iniciando verificación de autenticación
2025-08-05T19:10:45.999892536Z 🔐 [AuthMiddleware] Ruta: /conversations/public
2025-08-05T19:10:45.999900040Z 🔐 [AuthMiddleware] Método: GET
2025-08-05T19:10:45.999904459Z 🔐 [AuthMiddleware] Headers recibidos: {
2025-08-05T19:10:45.999908065Z   authorization: 'Presente',
2025-08-05T19:10:45.999911432Z   'content-type': 'application/json',
2025-08-05T19:10:45.999915318Z   'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0',
2025-08-05T19:10:45.999919125Z   origin: 'https://dev-waprueba.aova.mx',
2025-08-05T19:10:45.999922922Z   host: 'dev-apiwaprueba.aova.mx'
2025-08-05T19:10:45.999926379Z }
2025-08-05T19:10:45.999930306Z 🔐 [AuthMiddleware] Token extraído: eyJhbGciOiJIUzI1NiIs...
2025-08-05T19:10:45.999938051Z 🔐 [AuthMiddleware] Verificando token con Supabase...
2025-08-05T19:10:46.145919295Z ✅ [AuthMiddleware] Token válido, usuario encontrado: {
2025-08-05T19:10:46.145950373Z   userId: 'a128209e-d44c-42df-b5f9-c25f7ce92c1e',
2025-08-05T19:10:46.145953719Z   email: 'k.alvarado@aova.mx'
2025-08-05T19:10:46.145956154Z }
2025-08-05T19:10:46.145974839Z 🔐 [AuthMiddleware] Obteniendo perfil de usuario...
2025-08-05T19:10:46.242303008Z ✅ [AuthMiddleware] Perfil de usuario obtenido: {
2025-08-05T19:10:46.242326462Z   userId: 'a128209e-d44c-42df-b5f9-c25f7ce92c1e',
2025-08-05T19:10:46.242329758Z   username: 'k.alvarado@aova.mx',
2025-08-05T19:10:46.242332203Z   role: 'agent',
2025-08-05T19:10:46.242334547Z   isActive: true
2025-08-05T19:10:46.242336801Z }
2025-08-05T19:10:46.242339025Z ✅ [AuthMiddleware] Autenticación exitosa, continuando...
2025-08-05T19:10:46.242347862Z 🔍 [Dashboard] Consultando tabla conversations...
2025-08-05T19:10:46.350007859Z 🔍 [Dashboard] Conversaciones encontradas: 2
2025-08-05T19:10:46.350049898Z 🔍 [Dashboard] Primera conversación: {
2025-08-05T19:10:46.350053695Z   id: '9a37cf37-e830-4f0a-aab0-a909cd7b577e',
2025-08-05T19:10:46.350062221Z   contact_phone: '5215547292959',
2025-08-05T19:10:46.350068673Z   status: 'active',
2025-08-05T19:10:46.350074234Z   ai_mode: 'inactive',
2025-08-05T19:10:46.350077639Z   assigned_agent_id: 'a128209e-d44c-42df-b5f9-c25f7ce92c1e',
2025-08-05T19:10:46.350080935Z   created_at: '2025-07-31T01:26:01.152153+00:00',
2025-08-05T19:10:46.350083971Z   updated_at: '2025-08-05T18:33:23.932599+00:00',
2025-08-05T19:10:46.350086846Z   metadata: null,
2025-08-05T19:10:46.350089551Z   unread_count: 0,
2025-08-05T19:10:46.350092517Z   last_message_at: '2025-08-05T18:33:23.932599+00:00',
2025-08-05T19:10:46.350095533Z   takeover_mode: 'takeover'
2025-08-05T19:10:46.350099310Z }
2025-08-05T19:10:46.350205388Z 🔍 [Dashboard] Conversación transformada: {
2025-08-05T19:10:46.350228852Z   id: '9a37cf37-e830-4f0a-aab0-a909cd7b577e',
2025-08-05T19:10:46.350232118Z   contact_phone: '5215547292959',
2025-08-05T19:10:46.350234813Z   status: 'active',
2025-08-05T19:10:46.350237227Z   ai_mode: 'inactive',
2025-08-05T19:10:46.350239532Z   takeover_mode: 'takeover',
2025-08-05T19:10:46.350242247Z   assigned_agent_id: 'a128209e-d44c-42df-b5f9-c25f7ce92c1e',
2025-08-05T19:10:46.350244541Z   unread_count: 0,
2025-08-05T19:10:46.350246735Z   last_message_at: '2025-08-05T18:33:23.932599+00:00',
2025-08-05T19:10:46.350249219Z   created_at: '2025-07-31T01:26:01.152153+00:00',
2025-08-05T19:10:46.350251463Z   updated_at: '2025-08-05T18:33:23.932599+00:00',
2025-08-05T19:10:46.350253707Z   contact: {
2025-08-05T19:10:46.350255921Z     id: '5215547292959',
2025-08-05T19:10:46.350258166Z     name: '5215547292959',
2025-08-05T19:10:46.350260620Z     phone: '5215547292959'
2025-08-05T19:10:46.350262854Z   }
2025-08-05T19:10:46.350286980Z }
2025-08-05T19:10:46.350289474Z 🔍 [Dashboard] Conversación transformada: {
2025-08-05T19:10:46.350296497Z   id: '3da4d470-b877-48e9-bfae-64674d332c47',
2025-08-05T19:10:46.350298802Z   contact_phone: '5215549679734',
2025-08-05T19:10:46.350301116Z   status: 'active',
2025-08-05T19:10:46.350303390Z   ai_mode: 'inactive',
2025-08-05T19:10:46.350305665Z   takeover_mode: 'takeover',
2025-08-05T19:10:46.350307949Z   assigned_agent_id: 'a128209e-d44c-42df-b5f9-c25f7ce92c1e',
2025-08-05T19:10:46.350310263Z   unread_count: 0,
2025-08-05T19:10:46.350312508Z   last_message_at: '2025-08-05T02:16:28.602464+00:00',
2025-08-05T19:10:46.350314732Z   created_at: '2025-07-25T17:17:08.576739+00:00',
2025-08-05T19:10:46.350316956Z   updated_at: '2025-08-05T03:52:38.177+00:00',
2025-08-05T19:10:46.350319300Z   contact: {
2025-08-05T19:10:46.350321534Z     id: '5215549679734',
2025-08-05T19:10:46.350323779Z     name: '5215549679734',
2025-08-05T19:10:46.350325993Z     phone: '5215549679734'
2025-08-05T19:10:46.350328217Z   }
2025-08-05T19:10:46.350330501Z }
2025-08-05T19:10:46.350332755Z 🔍 [Dashboard] Enviando respuesta con 2 conversaciones
2025-08-05T19:10:52.827056392Z ✅ Takeover mode actualizado: 9a37cf37-e830-4f0a-aab0-a909cd7b577e -> takeover (agente: a128209e-d44c-42df-b5f9-c25f7ce92c1e) (razón: Agente tomó control manualmente)
2025-08-05T19:10:52.827097227Z ✅ Takeover mode actualizado: 9a37cf37-e830-4f0a-aab0-a909cd7b577e -> takeover (agente: a128209e-d44c-42df-b5f9-c25f7ce92c1e)
2025-08-05T19:11:37.350236773Z 🧹 Mensajes antiguos eliminados: 0
2025-08-05T19:11:38.036817501Z 2025-08-05T19:11:38.036Z [error]: Métrica memory_usage excedió threshold critical: 95.03220914558274% (threshold: 95) {
2025-08-05T19:11:38.036869669Z   "metric": {
2025-08-05T19:11:38.036875340Z     "name": "memory_usage",
2025-08-05T19:11:38.036879528Z     "value": 95.03220914558274,
2025-08-05T19:11:38.036883445Z     "unit": "%",
2025-08-05T19:11:38.036887402Z     "timestamp": 1754421098036
2025-08-05T19:11:38.036891199Z   },
2025-08-05T19:11:38.036894886Z   "threshold": {
2025-08-05T19:11:38.036898663Z     "warning": 80,
2025-08-05T19:11:38.036902540Z     "critical": 95,
2025-08-05T19:11:38.036906417Z     "action": "alert"
2025-08-05T19:11:38.036910264Z   }
2025-08-05T19:11:38.036913971Z }
2025-08-05T19:11:38.037007906Z 2025-08-05T19:11:38.036Z [error]: 🚨 CRÍTICO: Threshold excedido {
2025-08-05T19:11:38.037019178Z   "metricName": "memory_usage",
2025-08-05T19:11:38.037025399Z   "metric": {
2025-08-05T19:11:38.037042612Z     "name": "memory_usage",
2025-08-05T19:11:38.037045257Z     "value": 95.03220914558274,
2025-08-05T19:11:38.037047581Z     "unit": "%",
2025-08-05T19:11:38.037049895Z     "timestamp": 1754421098036
2025-08-05T19:11:38.037052270Z   },
2025-08-05T19:11:38.037054464Z   "threshold": {
2025-08-05T19:11:38.037056707Z     "warning": 80,
2025-08-05T19:11:38.037058921Z     "critical": 95,
2025-08-05T19:11:38.037061266Z     "action": "alert"
2025-08-05T19:11:38.037063530Z   }
2025-08-05T19:11:38.037065714Z }
2025-08-05T19:11:38.037155822Z 2025-08-05T19:11:38.037Z [warn]: 🚨 ALERTA: Métrica crítica {
2025-08-05T19:11:38.037164769Z   "metricName": "memory_usage",
2025-08-05T19:11:38.037168736Z   "metric": {
2025-08-05T19:11:38.037172303Z     "name": "memory_usage",
2025-08-05T19:11:38.037175910Z     "value": 95.03220914558274,
2025-08-05T19:11:38.037179536Z     "unit": "%",
2025-08-05T19:11:38.037183163Z     "timestamp": 1754421098036
2025-08-05T19:11:38.037186760Z   },
2025-08-05T19:11:38.037190156Z   "threshold": {
2025-08-05T19:11:38.037193222Z     "warning": 80,
2025-08-05T19:11:38.037196458Z     "critical": 95,
2025-08-05T19:11:38.037199965Z     "action": "alert"
2025-08-05T19:11:38.037203391Z   }
2025-08-05T19:11:38.037206657Z }
2025-08-05T19:11:38.037264184Z 2025-08-05T19:11:38.037Z [error]: Métrica cpu_usage excedió threshold critical: 100% (threshold: 90) {
2025-08-05T19:11:38.037268532Z   "metric": {
2025-08-05T19:11:38.037270847Z     "name": "cpu_usage",
2025-08-05T19:11:38.037273161Z     "value": 100,
2025-08-05T19:11:38.037275385Z     "unit": "%",
2025-08-05T19:11:38.037277599Z     "timestamp": 1754421098036
2025-08-05T19:11:38.037279833Z   },
2025-08-05T19:11:38.037282008Z   "threshold": {
2025-08-05T19:11:38.037284202Z     "warning": 70,
2025-08-05T19:11:38.037286456Z     "critical": 90,
2025-08-05T19:11:38.037299290Z     "action": "alert"
2025-08-05T19:11:38.037301674Z   }
2025-08-05T19:11:38.037303838Z }
2025-08-05T19:11:38.037362568Z 2025-08-05T19:11:38.037Z [error]: 🚨 CRÍTICO: Threshold excedido {
2025-08-05T19:11:38.037369400Z   "metricName": "cpu_usage",
2025-08-05T19:11:38.037373298Z   "metric": {
2025-08-05T19:11:38.037376664Z     "name": "cpu_usage",
2025-08-05T19:11:38.037379960Z     "value": 100,
2025-08-05T19:11:38.037391722Z     "unit": "%",
2025-08-05T19:11:38.037395579Z     "timestamp": 1754421098036
2025-08-05T19:11:38.037399025Z   },
2025-08-05T19:11:38.037401209Z   "threshold": {
2025-08-05T19:11:38.037403594Z     "warning": 70,
2025-08-05T19:11:38.037405928Z     "critical": 90,
2025-08-05T19:11:38.037408272Z     "action": "alert"
2025-08-05T19:11:38.037414504Z   }
2025-08-05T19:11:38.037416718Z }
2025-08-05T19:11:38.037483943Z 2025-08-05T19:11:38.037Z [warn]: 🚨 ALERTA: Métrica crítica {
2025-08-05T19:11:38.037497238Z   "metricName": "cpu_usage",
2025-08-05T19:11:38.037500795Z   "metric": {
2025-08-05T19:11:38.037503290Z     "name": "cpu_usage",
2025-08-05T19:11:38.037505804Z     "value": 100,
2025-08-05T19:11:38.037508139Z     "unit": "%",
2025-08-05T19:11:38.037510483Z     "timestamp": 1754421098036
2025-08-05T19:11:38.037512787Z   },
2025-08-05T19:11:38.037514981Z   "threshold": {
2025-08-05T19:11:38.037517236Z     "warning": 70,
2025-08-05T19:11:38.037519490Z     "critical": 90,
2025-08-05T19:11:38.037521894Z     "action": "alert"
2025-08-05T19:11:38.037524239Z   }
2025-08-05T19:11:38.037526433Z }
2025-08-05T19:12:30.458989419Z  [req_1754421150455_w4fihde7e] Webhook recibido desde IP: 173.252.127.21
2025-08-05T19:12:30.459047889Z  [req_1754421150455_w4fihde7e] Webhook: whatsapp_business_account, entries: 1, UA: facebookexternalua
2025-08-05T19:12:30.459053349Z 📨 Procesando webhook de WhatsApp...
2025-08-05T19:12:30.459058188Z 📨 Mensaje entrante de 5215547292959: text
2025-08-05T19:12:30.459131444Z 📝 Procesando texto de 5215547292959: prueba3,1:12...
2025-08-05T19:12:30.464322669Z ✅ [req_1754421150455_w4fihde7e] Webhook agregado a cola: msg_1754421150456_qks6v8rxp (prioridad: normal)
2025-08-05T19:12:30.464406605Z 📢 [req_1754421150455_w4fihde7e] Webhook procesado correctamente
2025-08-05T19:12:30.697221562Z ✅ Conversación encontrada/creada: 9a37cf37-e830-4f0a-aab0-a909cd7b577e para 5215547292959
2025-08-05T19:12:30.871232011Z 🔍 Chatbot puede procesar 9a37cf37-e830-4f0a-aab0-a909cd7b577e: false
2025-08-05T19:12:30.871273900Z 👤 Agente debe procesar mensaje de 5215547292959 (modo: takeover)
2025-08-05T19:12:31.050290278Z ⚠️ Función RPC no disponible, usando método alternativo
2025-08-05T19:12:31.188081315Z ✅ Conversación 9a37cf37-e830-4f0a-aab0-a909cd7b577e actualizada con último mensaje: 2025-08-05T19:12:30.943662+00:00
2025-08-05T19:12:31.188125878Z ✅ Mensaje creado en Supabase: 321 (user)
2025-08-05T19:12:31.188131257Z ✅ Mensaje guardado exitosamente, emitiendo evento Socket.IO
2025-08-05T19:12:31.190077575Z 🌐 [Socket] Evento 'new_message' emitido a conversación 9a37cf37-e830-4f0a-aab0-a909cd7b577e: {
2025-08-05T19:12:31.190114604Z   message: {
2025-08-05T19:12:31.190118792Z     id: 321,
2025-08-05T19:12:31.190121226Z     waMessageId: 'wamid.HBgNNTIxNTU0NzI5Mjk1ORUCABIYFDNBODhCMDk0QUUzQUFCRjJFODMxAA==',
2025-08-05T19:12:31.190123771Z     from: '5215547292959',
2025-08-05T19:12:31.190125995Z     to: 'us',
2025-08-05T19:12:31.190128380Z     message: 'prueba3,1:12',
2025-08-05T19:12:31.190130954Z     timestamp: 2025-08-05T19:12:29.000Z,
2025-08-05T19:12:31.190133369Z     type: 'text',
2025-08-05T19:12:31.190135683Z     read: false,
2025-08-05T19:12:31.190137917Z     conversationId: '9a37cf37-e830-4f0a-aab0-a909cd7b577e',
2025-08-05T19:12:31.190140532Z     contactId: '5215547292959',
2025-08-05T19:12:31.190142827Z     clientId: 'incoming_wamid.HBgNNTIxNTU0NzI5Mjk1ORUCABIYFDNBODhCMDk0QUUzQUFCRjJFODMxAA==_1754421150695'
2025-08-05T19:12:31.190145161Z   },
2025-08-05T19:12:31.190147405Z   conversation: {
2025-08-05T19:12:31.190149659Z     id: '9a37cf37-e830-4f0a-aab0-a909cd7b577e',
2025-08-05T19:12:31.190152124Z     contactId: '5215547292959',
2025-08-05T19:12:31.190154338Z     contactName: 'Moises',
2025-08-05T19:12:31.190156542Z     unreadCount: 0
2025-08-05T19:12:31.190158726Z   },
2025-08-05T19:12:31.190160941Z   timestamp: '2025-08-05T19:12:31.188Z'
2025-08-05T19:12:31.190167673Z }
2025-08-05T19:12:31.342875791Z ✅ Conversación marcada como leída: 9a37cf37-e830-4f0a-aab0-a909cd7b577e
2025-08-05T19:12:37.219216334Z 2025-08-05T19:12:37.218Z [error]: CRÍTICO: Uso de memoria muy alto {
2025-08-05T19:12:37.219264755Z   "usagePercent": "95.10%",
2025-08-05T19:12:37.219270215Z   "threshold": "95%"
2025-08-05T19:12:37.219274543Z }
2025-08-05T19:12:37.219826131Z 2025-08-05T19:12:37.219Z [error]: Iniciando limpieza de emergencia 
2025-08-05T19:12:37.220577361Z {
2025-08-05T19:12:37.220603940Z   service: 'whatsapp-llm',
2025-08-05T19:12:37.220608739Z   level: 'info',
2025-08-05T19:12:37.220612547Z   message: 'Cache limpiado',
2025-08-05T19:12:37.220616384Z   timestamp: '2025-08-05 19:12:37.220'
2025-08-05T19:12:37.220620301Z }
2025-08-05T19:12:37.221368125Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.221400766Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.221482268Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.221549713Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.221599906Z [InventoryCache] Cache completo limpiado, 0 entradas removidas
2025-08-05T19:12:37.222358050Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.222390049Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.222395239Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.222399767Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.222436727Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.222450252Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.222453228Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.222640145Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.222750481Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.222767884Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.223002841Z [Config] Parseando POS_CREDENTIALS: {"ME":{"user":"METEPEC","pwd":"MET12345"},"CUA":{"...
2025-08-05T19:12:37.223019052Z [Config] POS_CREDENTIALS parseado exitosamente para: ME, CUA, ECA, IZT, LIND, PORT, QRO, SAT, TPN, VC
2025-08-05T19:12:37.223023360Z [ConceptsService] Cargando conceptos desde Supabase...
2025-08-05T19:12:37.224197027Z {
2025-08-05T19:12:37.224224679Z   service: 'whatsapp-llm',
2025-08-05T19:12:37.224229568Z   level: 'info',
2025-08-05T19:12:37.224235659Z   message: 'Rate limiter destroyed',
2025-08-05T19:12:37.224240789Z   timestamp: '2025-08-05 19:12:37.223'
2025-08-05T19:12:37.224244766Z }
2025-08-05T19:12:37.317040403Z [ConceptsService] ✅ Cargados 49 conceptos desde Supabase
2025-08-05T19:12:37.317097019Z [ConceptsService] ✅ Total de variantes: 0
2025-08-05T19:12:38.037852632Z 2025-08-05T19:12:38.037Z [warn]: Métrica memory_usage excedió threshold warning: 93.02409158432367% (threshold: 80) {
2025-08-05T19:12:38.037882719Z   "metric": {
2025-08-05T19:12:38.037887277Z     "name": "memory_usage",
2025-08-05T19:12:38.037891185Z     "value": 93.02409158432367,
2025-08-05T19:12:38.037894720Z     "unit": "%",
2025-08-05T19:12:38.037898417Z     "timestamp": 1754421158036
2025-08-05T19:12:38.037901904Z   },
2025-08-05T19:12:38.037919897Z   "threshold": {
2025-08-05T19:12:38.037923865Z     "warning": 80,
2025-08-05T19:12:38.037927351Z     "critical": 95,
2025-08-05T19:12:38.037930788Z     "action": "alert"
2025-08-05T19:12:38.037934304Z   }
2025-08-05T19:12:38.037937761Z }
2025-08-05T19:12:38.038124459Z 2025-08-05T19:12:38.037Z [warn]: ⚠️ ADVERTENCIA: Threshold excedido {
2025-08-05T19:12:38.038132364Z   "metricName": "memory_usage",
2025-08-05T19:12:38.038136121Z   "metric": {
2025-08-05T19:12:38.038139587Z     "name": "memory_usage",
2025-08-05T19:12:38.038143194Z     "value": 93.02409158432367,
2025-08-05T19:12:38.038147061Z     "unit": "%",
2025-08-05T19:12:38.038150517Z     "timestamp": 1754421158036
2025-08-05T19:12:38.038153953Z   },
2025-08-05T19:12:38.038157280Z   "threshold": {
2025-08-05T19:12:38.038160756Z     "warning": 80,
2025-08-05T19:12:38.038164132Z     "critical": 95,
2025-08-05T19:12:38.038167609Z     "action": "alert"
2025-08-05T19:12:38.038170985Z   }