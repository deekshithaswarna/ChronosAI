CREATE TABLE `case_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` text,
	`summary` longtext,
	`parties` json,
	`issues` json,
	`source` enum('ai','user','uploaded') NOT NULL DEFAULT 'ai',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `case_memory_id` PRIMARY KEY(`id`),
	CONSTRAINT `case_memory_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `facts` ADD `materiality` int;--> statement-breakpoint
ALTER TABLE `facts` ADD `materialityReason` text;--> statement-breakpoint
ALTER TABLE `facts` ADD `isKeyOverride` boolean;