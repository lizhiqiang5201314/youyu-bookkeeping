import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';
import type { Asset, AssetType } from '@/types';
import { generateUUID, ASSET_TYPE_CONFIG } from '@/utils/constants';

interface AssetState {
  assets: Asset[];
  isLoading: boolean;
  
  // Actions
  addAsset: (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => Asset;
  updateAsset: (id: string, data: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  
  // Queries
  getAssetsByUser: (userId: string) => Asset[];
  getTotalAssets: (userId: string) => number;
  getTotalLiabilities: (userId: string) => number;
  getNetWorth: (userId: string) => number;
  getAssetsByType: (userId: string, type: AssetType) => Asset[];
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      assets: [],
      isLoading: false,

      addAsset: (data) => {
        const now = new Date().toISOString();
        const asset: Asset = {
          ...data,
          id: generateUUID(),
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          assets: [...state.assets, asset],
        }));

        return asset;
      },

      updateAsset: (id, data) => {
        set(state => ({
          assets: state.assets.map(a =>
            a.id === id
              ? { ...a, ...data, updatedAt: new Date().toISOString() }
              : a
          ),
        }));
      },

      deleteAsset: (id) => {
        set(state => ({
          assets: state.assets.filter(a => a.id !== id),
        }));
      },

      getAssetsByUser: (userId) => {
        return get().assets
          .filter(a => a.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getTotalAssets: (userId) => {
        return get().assets
          .filter(a => a.userId === userId && !ASSET_TYPE_CONFIG[a.type].isLiability && a.isIncluded)
          .reduce((sum, a) => sum + a.balance, 0);
      },

      getTotalLiabilities: (userId) => {
        return get().assets
          .filter(a => a.userId === userId && ASSET_TYPE_CONFIG[a.type].isLiability && a.isIncluded)
          .reduce((sum, a) => sum + a.balance, 0);
      },

      getNetWorth: (userId) => {
        return get().getTotalAssets(userId) - get().getTotalLiabilities(userId);
      },

      getAssetsByType: (userId, type) => {
        return get().assets.filter(a => a.userId === userId && a.type === type);
      },
    }),
    {
      name: 'asset-store',
      storage: {
        getItem: async (name) => {
          const value = await storage.get<string>(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await storage.set(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await storage.remove(name);
        },
      },
    }
  )
);
