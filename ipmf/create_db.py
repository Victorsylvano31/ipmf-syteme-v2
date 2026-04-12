import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    print("Connecting to 'postgres' to create 'ipmf_db'...")
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="Sylvano061103",
        host="localhost",
        port="5432"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    # Check if database exists
    cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'ipmf_db';")
    exists = cur.fetchone()
    if not exists:
        print("Creating database 'ipmf_db'...")
        cur.execute("CREATE DATABASE ipmf_db;")
        print("Database 'ipmf_db' created successfully!")
    else:
        print("Database 'ipmf_db' already exists.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Failed to create database: {e}")
