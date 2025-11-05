# Marco 016: Lead Import (CSV)
> Backend + Frontend - Importação em massa de leads | 3 dias

**Responsável**: Backend Dev + Frontend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar funcionalidade de importação em massa de leads via arquivo CSV, com validação, mapeamento de campos, preview e relatório de resultados.

---

## 📋 Contexto

Empresas geralmente têm leads em planilhas/outros CRMs. A importação deve:
- Aceitar CSV (padrão universal)
- Validar dados antes de importar
- Mapear colunas automaticamente
- Mostrar preview antes de confirmar
- Processar em background (para grandes volumes)
- Gerar relatório: sucessos, falhas, duplicados

---

## 🏗️ Arquitetura

```
User uploads CSV
     ↓
[Parse & Validate]
     ↓
[Preview (first 10 rows)]
     ↓
User confirms
     ↓
[Celery Task: Bulk Import]
     ↓
[Create leads + Auto-qualify]
     ↓
[Generate Report]
```

---

## 💻 Backend Implementation

### 1. CSV Parser Service

```python
# src/services/csv_import_service.py

import csv
import io
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import re

class CSVImportService:
    """
    Serviço para importação de leads via CSV
    """

    # Mapeamento de colunas (aliases)
    COLUMN_MAPPINGS = {
        'name': ['name', 'nome', 'full name', 'contact name'],
        'email': ['email', 'e-mail', 'email address'],
        'phone': ['phone', 'telefone', 'mobile', 'celular'],
        'company': ['company', 'empresa', 'organization'],
        'job_title': ['job title', 'cargo', 'title', 'position'],
        'source': ['source', 'origem', 'lead source'],
        'source_details': ['source details', 'detalhes', 'notes']
    }

    REQUIRED_FIELDS = ['name', 'email']

    def parse_csv(self, file_content: bytes) -> Tuple[List[str], List[Dict], List[str]]:
        """
        Parseia CSV e retorna headers, rows e erros

        Returns:
            (headers, rows, errors)
        """
        errors = []

        try:
            # Decode file
            content = file_content.decode('utf-8-sig')  # Remove BOM se presente
        except UnicodeDecodeError:
            try:
                content = file_content.decode('latin-1')
            except:
                errors.append("File encoding not supported. Use UTF-8 or Latin-1.")
                return [], [], errors

        # Parse CSV
        try:
            csv_reader = csv.DictReader(io.StringIO(content))
            headers = csv_reader.fieldnames or []
            rows = list(csv_reader)
        except Exception as e:
            errors.append(f"Failed to parse CSV: {str(e)}")
            return [], [], errors

        # Validar headers
        if not headers:
            errors.append("CSV file is empty or has no headers.")
            return [], [], errors

        return headers, rows, errors

    def map_columns(self, headers: List[str]) -> Dict[str, str]:
        """
        Mapeia colunas do CSV para campos do sistema

        Returns:
            {csv_column: system_field}
        """
        mapping = {}

        for header in headers:
            header_lower = header.lower().strip()

            # Procurar match exato ou alias
            for system_field, aliases in self.COLUMN_MAPPINGS.items():
                if header_lower in aliases:
                    mapping[header] = system_field
                    break

        return mapping

    def validate_row(self, row: Dict, column_mapping: Dict[str, str]) -> Tuple[Optional[Dict], List[str]]:
        """
        Valida uma linha do CSV

        Returns:
            (mapped_data, errors)
        """
        errors = []
        mapped = {}

        # Mapear colunas
        for csv_col, system_field in column_mapping.items():
            value = row.get(csv_col, '').strip()
            if value:
                mapped[system_field] = value

        # Validar campos obrigatórios
        for field in self.REQUIRED_FIELDS:
            if not mapped.get(field):
                errors.append(f"Missing required field: {field}")

        # Validar email format
        if mapped.get('email'):
            if not self._is_valid_email(mapped['email']):
                errors.append(f"Invalid email format: {mapped['email']}")

        # Validar phone format (se presente)
        if mapped.get('phone'):
            mapped['phone'] = self._normalize_phone(mapped['phone'])

        # Adicionar defaults
        if not mapped.get('source'):
            mapped['source'] = 'import'

        if not mapped.get('status'):
            mapped['status'] = 'new'

        if errors:
            return None, errors

        return mapped, []

    def _is_valid_email(self, email: str) -> bool:
        """Valida formato de email"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    def _normalize_phone(self, phone: str) -> str:
        """Normaliza formato de telefone"""
        # Remove caracteres especiais
        digits = re.sub(r'\D', '', phone)

        # Format brasileiro: +55 11 99999-9999
        if len(digits) >= 10:
            if len(digits) == 11:
                return f"+55 {digits[:2]} {digits[2:7]}-{digits[7:]}"
            elif len(digits) == 10:
                return f"+55 {digits[:2]} {digits[2:6]}-{digits[6:]}"

        return phone  # Retornar original se não conseguir formatar
```

---

### 2. Bulk Import Task

```python
# src/tasks/import_tasks.py

from celery import Task
from src.services.csv_import_service import CSVImportService
from src.database import db
from datetime import datetime
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class BulkImportLeadsTask(Task):
    """
    Celery task para importação em massa
    """
    name = 'tasks.bulk_import_leads'

    def run(self, import_id: str, rows: List[Dict], column_mapping: Dict[str, str], user_id: str):
        """
        Importa leads em massa
        """
        csv_service = CSVImportService()

        results = {
            'total': len(rows),
            'success': 0,
            'failed': 0,
            'duplicates': 0,
            'errors': [],
            'created_ids': []
        }

        # Processar cada linha
        for idx, row in enumerate(rows, start=1):
            try:
                # Validar e mapear
                mapped_data, errors = csv_service.validate_row(row, column_mapping)

                if errors:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': idx,
                        'data': row,
                        'errors': errors
                    })
                    continue

                # Verificar duplicado (email)
                existing = db.leads.find_one({'email': mapped_data['email']})
                if existing:
                    results['duplicates'] += 1
                    results['errors'].append({
                        'row': idx,
                        'data': row,
                        'errors': [f"Email already exists: {mapped_data['email']}"]
                    })
                    continue

                # Criar lead
                lead = {
                    **mapped_data,
                    'created_by': user_id,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow(),
                    'enrichment_status': 'pending'
                }

                result = db.leads.insert_one(lead)
                lead_id = str(result.inserted_id)

                results['success'] += 1
                results['created_ids'].append(lead_id)

                # Trigger enrichment (async)
                from src.tasks.enrichment_tasks import EnrichLeadTask
                EnrichLeadTask().delay(lead_id)

                # Trigger qualification (async)
                from src.tasks.qualification_tasks import QualifyLeadTask
                QualifyLeadTask().delay(lead_id)

            except Exception as e:
                logger.error(f"Failed to import row {idx}: {str(e)}")
                results['failed'] += 1
                results['errors'].append({
                    'row': idx,
                    'data': row,
                    'errors': [str(e)]
                })

        # Salvar relatório
        db.import_jobs.update_one(
            {'_id': ObjectId(import_id)},
            {
                '$set': {
                    'status': 'completed',
                    'results': results,
                    'completed_at': datetime.utcnow()
                }
            }
        )

        logger.info(f"Import completed: {results['success']}/{results['total']} leads created")

        return results
```

---

### 3. API Endpoints

```python
# src/api/routes/import.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from src.services.csv_import_service import CSVImportService
from src.tasks.import_tasks import BulkImportLeadsTask
from src.database import db
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/import/preview")
async def preview_import(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """
    Preview de importação: parseia CSV e retorna primeiras linhas
    """
    # Validar arquivo
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # Ler conteúdo
    content = await file.read()

    # Parsear CSV
    csv_service = CSVImportService()
    headers, rows, errors = csv_service.parse_csv(content)

    if errors:
        return {
            'success': False,
            'errors': errors
        }

    # Mapear colunas automaticamente
    column_mapping = csv_service.map_columns(headers)

    # Validar primeiras 10 linhas
    preview_rows = []
    for row in rows[:10]:
        mapped_data, row_errors = csv_service.validate_row(row, column_mapping)
        preview_rows.append({
            'original': row,
            'mapped': mapped_data,
            'valid': len(row_errors) == 0,
            'errors': row_errors
        })

    # Salvar arquivo temporariamente
    import_job = {
        'user_id': current_user,
        'filename': file.filename,
        'total_rows': len(rows),
        'headers': headers,
        'column_mapping': column_mapping,
        'file_content': content,  # Store temporarily
        'status': 'preview',
        'created_at': datetime.utcnow()
    }

    result = db.import_jobs.insert_one(import_job)
    import_id = str(result.inserted_id)

    return {
        'success': True,
        'import_id': import_id,
        'total_rows': len(rows),
        'headers': headers,
        'column_mapping': column_mapping,
        'preview': preview_rows,
        'required_fields': csv_service.REQUIRED_FIELDS,
        'available_fields': list(csv_service.COLUMN_MAPPINGS.keys())
    }

@router.post("/import/{import_id}/confirm")
async def confirm_import(
    import_id: str,
    column_mapping: Dict[str, str],
    current_user: str = Depends(get_current_user)
):
    """
    Confirma importação e processa em background
    """
    # Buscar job
    import_job = db.import_jobs.find_one({'_id': ObjectId(import_id)})
    if not import_job:
        raise HTTPException(status_code=404, detail="Import job not found")

    # Parse CSV novamente
    csv_service = CSVImportService()
    headers, rows, errors = csv_service.parse_csv(import_job['file_content'])

    if errors:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {errors}")

    # Atualizar job status
    db.import_jobs.update_one(
        {'_id': ObjectId(import_id)},
        {
            '$set': {
                'status': 'processing',
                'column_mapping': column_mapping,
                'started_at': datetime.utcnow()
            }
        }
    )

    # Trigger background task
    task = BulkImportLeadsTask().delay(
        import_id=import_id,
        rows=rows,
        column_mapping=column_mapping,
        user_id=current_user
    )

    return {
        'import_id': import_id,
        'task_id': task.id,
        'status': 'processing',
        'total_rows': len(rows),
        'message': 'Import started. You will be notified when completed.',
        'status_url': f'/import/{import_id}/status'
    }

@router.get("/import/{import_id}/status")
async def get_import_status(import_id: str):
    """
    Retorna status da importação
    """
    import_job = db.import_jobs.find_one({'_id': ObjectId(import_id)})
    if not import_job:
        raise HTTPException(status_code=404, detail="Import job not found")

    return {
        'import_id': import_id,
        'status': import_job['status'],
        'total_rows': import_job.get('total_rows', 0),
        'results': import_job.get('results'),
        'created_at': import_job['created_at'],
        'completed_at': import_job.get('completed_at')
    }
```

---

## 🎨 Frontend Component

```typescript
// src/app/features/leads/components/lead-import/lead-import.component.ts

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

interface ImportPreview {
  import_id: string;
  total_rows: number;
  headers: string[];
  column_mapping: { [key: string]: string };
  preview: any[];
  required_fields: string[];
  available_fields: string[];
}

@Component({
  selector: 'app-lead-import',
  templateUrl: './lead-import.component.html',
  styleUrls: ['./lead-import.component.scss']
})
export class LeadImportComponent {
  step = 1;  // 1: Upload, 2: Map, 3: Preview, 4: Importing

  file: File | null = null;
  preview: ImportPreview | null = null;
  columnMapping: { [key: string]: string } = {};

  importing = false;
  importResults: any = null;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: any): void {
    this.file = event.target.files[0];
    if (this.file) {
      this.uploadForPreview();
    }
  }

  async uploadForPreview(): Promise<void> {
    if (!this.file) return;

    const formData = new FormData();
    formData.append('file', this.file);

    try {
      this.preview = await this.http.post<ImportPreview>(
        '/api/v1/import/preview',
        formData
      ).toPromise();

      this.columnMapping = this.preview!.column_mapping;
      this.step = 2;

    } catch (error: any) {
      this.snackBar.open(
        `Upload failed: ${error.error?.detail || error.message}`,
        'Close',
        { duration: 5000 }
      );
    }
  }

  confirmMapping(): void {
    this.step = 3;
  }

  async startImport(): Promise<void> {
    if (!this.preview) return;

    this.importing = true;
    this.step = 4;

    try {
      const response = await this.http.post<any>(
        `/api/v1/import/${this.preview.import_id}/confirm`,
        { column_mapping: this.columnMapping }
      ).toPromise();

      // Poll for status
      this.pollImportStatus(this.preview.import_id);

    } catch (error: any) {
      this.snackBar.open(
        `Import failed: ${error.error?.detail || error.message}`,
        'Close',
        { duration: 5000 }
      );
      this.importing = false;
    }
  }

  async pollImportStatus(importId: string): Promise<void> {
    const interval = setInterval(async () => {
      try {
        const status = await this.http.get<any>(
          `/api/v1/import/${importId}/status`
        ).toPromise();

        if (status.status === 'completed') {
          clearInterval(interval);
          this.importing = false;
          this.importResults = status.results;

          this.snackBar.open(
            `Import completed! ${status.results.success} leads created.`,
            'Close',
            { duration: 5000 }
          );
        }
      } catch (error) {
        clearInterval(interval);
        this.importing = false;
      }
    }, 2000);  // Poll every 2 seconds
  }

  reset(): void {
    this.step = 1;
    this.file = null;
    this.preview = null;
    this.columnMapping = {};
    this.importing = false;
    this.importResults = null;
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Upload de arquivo CSV funciona
- [ ] Parser detecta encoding (UTF-8, Latin-1)
- [ ] Mapeamento automático de colunas
- [ ] Preview mostra primeiras 10 linhas
- [ ] Validação de campos obrigatórios
- [ ] Validação de formato de email
- [ ] Detecção de duplicados (email)
- [ ] Processamento em background (Celery)
- [ ] Relatório de importação completo
- [ ] Leads importados são auto-qualificados
- [ ] Leads importados são auto-enriquecidos
- [ ] UI mostra progresso
- [ ] Error handling robusto

---

## 🔗 Dependências

- ✅ Marco 009: Lead Model & API
- ✅ Marco 012: LeadQualifier_Agent (auto-qualify)
- ✅ Marco 013: Auto-Enrichment (auto-enrich)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
