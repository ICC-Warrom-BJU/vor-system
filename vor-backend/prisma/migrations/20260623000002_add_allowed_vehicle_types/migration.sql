-- Add allowedVehicleTypes array column to User table
ALTER TABLE "User" ADD COLUMN "allowedVehicleTypes" TEXT[] NOT NULL DEFAULT '{}';
