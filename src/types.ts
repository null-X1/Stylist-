/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'male' | 'female';
export type Season = 'summer' | 'winter' | 'spring' | 'autumn';
export type Category = 'casual' | 'formal' | 'work' | 'party' | 'university' | 'sport' | 'other';
export type ModestyLevel = 'modest' | 'regular';

export interface ClothingItem {
  id: string;
  userId: string;
  imageUrl: string;
  type: string;
  category: Category;
  color: string;
  material: string;
  style: string;
  gender: Gender;
  season: Season[];
  brand?: string;
  usageFrequency: number;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
}

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  description: string;
  items: ClothingItem[];
  createdAt: number;
}

export interface Message {
  id: string;
  chatId: string;
  sender: 'user' | 'ai';
  text: string;
  suggestions?: string[];
  outfitSuggestionId?: string;
  selectedItems?: { id: string; type: string; color: string; name: string }[];
  timestamp: number;
}

export interface Chat {
  id: string;
  userId: string;
  lastMessage: string;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  gender: Gender;
  isModestPreferred: boolean;
  stylePreferences: string[];
  onboardingCompleted: boolean;
}
