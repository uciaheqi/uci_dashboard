# Tablero UCI · Backend independiente (FastAPI + Google Sheets)

Este proyecto implementa un tablero estadístico para la UCI conectado al libro de Google Sheets

`https://docs.google.com/spreadsheets/d/1r_OmMJirLBC33Gjtl-mzlAxYKodnK-ld1ARlei7ut7k`

usando un **service account** y la API de Google Sheets, sin depender de Google Apps Script.

La arquitectura es:

- Backend en Python con FastAPI (`main.py`), que lee y escribe en la hoja `BASE_UCI`.
- Frontend estático (HTML + CSS + JS) servido por el mismo FastAPI desde la carpeta `static/`.


## Estructura de archivos

```text
.
├─ main.py                       # API REST (FastAPI) + servidor de estáticos
├─ requirements.txt              # Dependencias Python
├─ .gitignore                    # Incluye service_account.json para no subirlo al repo
├─ service_account.example.json  # Ejemplo de credenciales (no funcional)
└─ static/
   ├─ index.html                 # Dashboard + formulario
   └─ assets/
      ├─ css/
      │  └─ styles.css           # Estilos
      └─ js/
         └─ app.js               # Lógica del tablero y llamadas a la API
```

La hoja `BASE_UCI` debe tener como encabezados en la fila 1:

- `fecha_de_ingreso`
- `fecha_de_egreso`
- `edad`
- `sexo`
- `condicion_al_egreso`
- `diagnostico`
- `nombre_y_apellido`


## 1. Preparar el service account

1. En Google Cloud Console crea (o usa) un **service account** con acceso a Google Sheets API.
2. Genera una clave JSON y descárgala.
3. Renombra ese archivo descargado como `service_account.json` y colócalo en la raíz del proyecto
   (mismo nivel que `main.py`).
4. Asegúrate de que este correo del service account tenga acceso de lectura y escritura al libro:
   compártelo desde Google Sheets como *Editor*.

**Importante:**

- No subas el archivo `service_account.json` a GitHub. Ya está incluido en `.gitignore`.
- El archivo `service_account.example.json` es solo un ejemplo para documentar el formato.


## 2. Crear y activar entorno virtual

```bash
cd uci_dashboard_independiente  # o el nombre que le des al proyecto

python -m venv venv
source venv/bin/activate        # Linux / macOS
# venv\Scripts\activate       # Windows
```

Instalar dependencias:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```


## 3. Ejecutar el backend

Con el entorno virtual activado y `service_account.json` en la raíz:

```bash
uvicorn main:app --reload
```

Por defecto FastAPI quedará escuchando en `http://127.0.0.1:8000/`.

- El dashboard web estará disponible en:  
  `http://127.0.0.1:8000/`
- La API REST para los registros UCI expone:  
  - `GET /api/uci/registros`  (listar registros)  
  - `POST /api/uci/registros` (crear nuevo registro)


## 4. Flujo de datos

1. El navegador carga `static/index.html` servido por FastAPI.
2. El JavaScript (`static/assets/js/app.js`) hace un `GET` a `/api/uci/registros`.
3. El backend usa `gspread` con el service account para abrir el libro de Sheets
   y leer la hoja `BASE_UCI`.
4. Los datos leídos se envían en JSON al navegador, que actualiza:
   - tarjetas de resumen
   - gráficos (Chart.js)
   - tabla de últimos registros.
5. Cuando se envía el formulario, el navegador hace un `POST` a `/api/uci/registros` con el cuerpo JSON.
6. El backend inserta una nueva fila en `BASE_UCI` respetando el orden de encabezados.


## 5. Ajustes y despliegue

- Si cambias el ID del libro o el nombre de la hoja, actualiza en `main.py`:

  ```python
  SPREADSHEET_ID = "1r_OmMJirLBC33Gjtl-mzlAxYKodnK-ld1ARlei7ut7k"
  SHEET_NAME = "BASE_UCI"
  ```

- Para desplegar en un servidor (por ejemplo, un VPS o un servicio como Railway/Render/Cloud Run) bastará
  con subir el código, definir la variable `GOOGLE_APPLICATION_CREDENTIALS` o colocar `service_account.json`
  en el directorio de ejecución, instalar dependencias y levantar `uvicorn` detrás de un servidor web.

- Si deseas separar completamente el frontend (por ejemplo, servir `static/` con GitHub Pages), puedes:
  - cambiar en `static/assets/js/app.js` la constante `API_URL` para apuntar al dominio donde esté levantado FastAPI.
  - habilitar CORS en FastAPI para dicho dominio (ya está abierto a `*` para pruebas).


## 6. Seguridad de las credenciales

Las credenciales del service account son **altamente sensibles**. Recomendaciones:

- Nunca agregar `service_account.json` al control de versiones.
- Si en algún momento las claves se hicieron públicas, revocarlas y generar una nueva clave desde Google Cloud.
- En producción, usar variables de entorno o un gestor de secretos en lugar de copiar directamente el JSON en el servidor.
