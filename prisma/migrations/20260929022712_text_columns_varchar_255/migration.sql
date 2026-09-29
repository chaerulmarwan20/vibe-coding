-- AlterTable
ALTER TABLE `sessions` MODIFY `token` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `email` VARCHAR(255) NOT NULL,
    MODIFY `name` VARCHAR(255) NOT NULL,
    MODIFY `password` VARCHAR(255) NOT NULL;
