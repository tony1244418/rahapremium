-- Migration: Add show_in_slider column to live_channels table
-- Run this in the Supabase Dashboard > SQL Editor

ALTER TABLE live_channels 
ADD COLUMN IF NOT EXISTS show_in_slider boolean NOT NULL DEFAULT false;
