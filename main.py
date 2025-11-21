from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import gspread
import os

SPREADSHEET_ID = "1r_OmMJirLBC33Gjtl-mzlAxYKodnK-ld1ARlei7ut7k"
SHEET_NAME = "BASE_UCI"
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service_account.json")

app = FastAPI(title="UCI Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_sheet():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise RuntimeError("No se encontró el archivo de credenciales del service account.")
    client = gspread.service_account(filename=SERVICE_ACCOUNT_FILE)
    spreadsheet = client.open_by_key(SPREADSHEET_ID)
    sheet = spreadsheet.worksheet(SHEET_NAME)
    return sheet


class Registro(BaseModel):
    fecha_de_ingreso: str
    fecha_de_egreso: str | None = None
    edad: int
    sexo: str
    condicion_al_egreso: str
    diagnostico: str | None = None
    nombre_y_apellido: str | None = None


@app.get("/api/uci/registros")
def listar_registros():
    try:
        sheet = get_sheet()
        values = sheet.get_all_values()
        if not values or len(values) < 2:
            return {"status": "ok", "data": []}

        headers = [h.strip() for h in values[0]]
        data = []

        for row in values[1:]:
            if all(cell == "" for cell in row):
                continue
            obj = {}
            for header, cell in zip(headers, row):
                obj[header] = cell
            data.append(obj)

        return {"status": "ok", "data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/uci/registros")
def crear_registro(registro: Registro):
    try:
        sheet = get_sheet()
        last_column = sheet.col_count
        headers_range = sheet.range(1, 1, 1, last_column)
        headers = [cell.value.strip() for cell in headers_range if cell.value]

        payload = registro.dict()
        new_row = []
        for header in headers:
            value = payload.get(header, "")
            if value is None:
                value = ""
            new_row.append(str(value))

        sheet.append_row(new_row, value_input_option="USER_ENTERED")

        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


app.mount("/", StaticFiles(directory="static", html=True), name="static")
