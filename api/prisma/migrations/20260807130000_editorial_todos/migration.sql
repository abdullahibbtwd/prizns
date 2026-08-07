-- CreateTable
CREATE TABLE "editorial_todos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editorial_todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "editorial_todos_user_id_done_created_at_idx" ON "editorial_todos"("user_id", "done", "created_at");

-- AddForeignKey
ALTER TABLE "editorial_todos" ADD CONSTRAINT "editorial_todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
