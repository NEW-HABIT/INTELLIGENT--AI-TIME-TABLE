"""Management command: wait_for_db"""
import time
from django.db import connection
from django.db.utils import OperationalError
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Wait for database to be available"

    def handle(self, *args, **options):
        self.stdout.write("⏳ Waiting for database...")
        db_up = False
        attempts = 0
        while not db_up and attempts < 30:
            try:
                connection.ensure_connection()
                db_up = True
            except OperationalError:
                attempts += 1
                self.stdout.write(f"  Database unavailable, retrying... ({attempts}/30)")
                time.sleep(2)

        if db_up:
            self.stdout.write(self.style.SUCCESS("✅ Database is available!"))
        else:
            self.stdout.write(self.style.ERROR("❌ Database not available after 30 retries"))
            raise Exception("Database connection failed")
