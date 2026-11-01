import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const collections = sqliteTable('shared_collections',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),ownerName:text('owner_name').notNull(),token:text('token').notNull().unique(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),
});
export const recipes = sqliteTable('shared_recipes',{
 collectionId:text('collection_id').notNull(),id:text('id').notNull(),recipe:text('recipe_json').notNull(),position:integer('position').notNull(),
},t=>[primaryKey({columns:[t.collectionId,t.id]})]);
export const subscriptions=sqliteTable('subscriptions',{
 userId:text('user_id').notNull(),collectionId:text('collection_id').notNull(),createdAt:integer('created_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.collectionId]})]);
export const ratings=sqliteTable('recipe_ratings',{
 userId:text('user_id').notNull(),ownerId:text('owner_id').notNull(),recipeId:text('recipe_id').notNull(),score:integer('score').notNull(),updatedAt:integer('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.ownerId,t.recipeId]})]);
export const loginThrottle=sqliteTable('login_throttle',{
 ip:text('ip').primaryKey(),fails:integer('fails').notNull(),firstFail:integer('first_fail').notNull(),lockedUntil:integer('locked_until').notNull(),
});
