-- AlterTable
ALTER TABLE "users" ADD COLUMN "roles" "Role"[] DEFAULT ARRAY[]::"Role"[];

UPDATE "users" SET "roles" = ARRAY["role"]::"Role"[];

-- AlterTable
ALTER TABLE "authors" ADD COLUMN "show_on_authors" BOOLEAN NOT NULL DEFAULT false;

-- Unlinked bylines and users whose primary/extra role includes AUTHOR stay listed.
UPDATE "authors" AS a
SET "show_on_authors" = true
WHERE a."user_id" IS NULL
   OR EXISTS (
     SELECT 1 FROM "users" u
     WHERE u.id = a."user_id"
       AND (u.role = 'AUTHOR' OR 'AUTHOR' = ANY (u.roles))
   );
