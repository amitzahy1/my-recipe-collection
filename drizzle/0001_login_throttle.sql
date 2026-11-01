CREATE TABLE `login_throttle` (
	`ip` text PRIMARY KEY NOT NULL,
	`fails` integer NOT NULL,
	`first_fail` integer NOT NULL,
	`locked_until` integer NOT NULL
);
