#!/usr/bin/env python3
import json
import os

def clean_string_for_sql(text):
    """Limpiar string para SQL"""
    if not text:
        return 'NULL'
    # Escapar comillas simples
    cleaned = str(text).replace("'", "''")
    return f"'{cleaned}'"

def generate_basic_catalog_inserts():
    """Generar inserts para catálogo básico"""
    
    # Ruta al archivo desde el directorio scripts
    json_file = os.path.join('..', 'public', 'embler', 'inventario', 'c_embler.json')
    
    if not os.path.exists(json_file):
        print(f"❌ Archivo no encontrado: {json_file}")
        return
    
    print(f"📂 Leyendo {json_file}...")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    print(f"📊 Total de productos: {len(products)}")
    
    # Generar en lotes de 500
    batch_size = 500
    total_batches = (len(products) + batch_size - 1) // batch_size
    
    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(products))
        batch = products[start_idx:end_idx]
        
        print(f"📦 Generando lote {batch_num + 1}/{total_batches} ({len(batch)} productos)...")
        
        # Archivo de salida
        output_file = f"insert_basic_catalog_batch_{batch_num + 1:03d}.sql"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Lote {batch_num + 1} del catálogo básico\n")
            f.write(f"-- Productos {start_idx + 1} a {end_idx}\n\n")
            
            # Comenzar INSERT
            f.write("INSERT INTO product_basic_catalog (clave, nombre, is_active) VALUES\n")
            
            # Generar valores
            values = []
            for i, product in enumerate(batch):
                clave = product.get('Clave')
                nombre = product.get('Nombre')
                
                # Validar que nombre existe y no está vacío
                if not nombre or str(nombre).strip() == '':
                    continue
                
                # Limpiar clave
                if clave is None or str(clave).strip() == '':
                    clave_sql = 'NULL'
                else:
                    clave_sql = clean_string_for_sql(str(clave))
                
                # Limpiar nombre
                nombre_sql = clean_string_for_sql(str(nombre).strip())
                
                values.append(f"({clave_sql}, {nombre_sql}, true)")
            
            # Escribir valores
            if values:
                f.write(',\n'.join(values))
                f.write(';\n')
            else:
                f.write("-- No hay productos válidos en este lote\n")
                
        if values:
            print(f"✅ Generado {output_file} con {len(values)} productos")
        else:
            print(f"⚠️  Lote {batch_num + 1} vacío")
    
    print(f"\n🎉 Generación completada: {total_batches} archivos SQL creados")

if __name__ == "__main__":
    generate_basic_catalog_inserts() 