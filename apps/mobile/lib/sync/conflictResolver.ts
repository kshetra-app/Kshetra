/**
 * Local-First Conflict Resolver
 * Handles conflict resolution strategies, version increments, and tombstone precedence.
 * Master Execution Framework — W021.5-I-01
 */

import type { ConflictStrategy } from './syncTypes';

export interface EntityVersion {
  version: number;
  updatedAt: string;
  isDeleted?: boolean;
}

export class ConflictResolver {
  private defaultStrategy: ConflictStrategy;

  constructor(defaultStrategy: ConflictStrategy = 'LAST_WRITE_WINS') {
    this.defaultStrategy = defaultStrategy;
  }

  resolve<T extends EntityVersion>(
    localEntity: T | null,
    serverEntity: T,
    strategy: ConflictStrategy = this.defaultStrategy
  ): { winningEntity: T; isLocalWinner: boolean; reason: string } {
    if (!localEntity) {
      return {
        winningEntity: serverEntity,
        isLocalWinner: false,
        reason: 'NEW_SERVER_ENTITY'
      };
    }

    // Tombstone handling: Deletion takes precedence unless explicit override
    if (localEntity.isDeleted && !serverEntity.isDeleted) {
      return {
        winningEntity: localEntity,
        isLocalWinner: true,
        reason: 'LOCAL_TOMBSTONE_PRECEDENCE'
      };
    }

    if (!localEntity.isDeleted && serverEntity.isDeleted) {
      return {
        winningEntity: serverEntity,
        isLocalWinner: false,
        reason: 'SERVER_TOMBSTONE_PRECEDENCE'
      };
    }

    if (strategy === 'CLIENT_WINS') {
      return {
        winningEntity: localEntity,
        isLocalWinner: true,
        reason: 'STRATEGY_CLIENT_WINS'
      };
    }

    if (strategy === 'SERVER_WINS') {
      return {
        winningEntity: serverEntity,
        isLocalWinner: false,
        reason: 'STRATEGY_SERVER_WINS'
      };
    }

    // Last-Write-Wins strategy (comparing timestamps or versions)
    const localTime = new Date(localEntity.updatedAt).getTime();
    const serverTime = new Date(serverEntity.updatedAt).getTime();

    if (localTime > serverTime) {
      return {
        winningEntity: localEntity,
        isLocalWinner: true,
        reason: `LWW_LOCAL_NEWER (${localTime} > ${serverTime})`
      };
    } else if (serverTime > localTime) {
      return {
        winningEntity: serverEntity,
        isLocalWinner: false,
        reason: `LWW_SERVER_NEWER (${serverTime} > ${localTime})`
      };
    }

    // Identical timestamp fallback: higher version wins
    if ((localEntity.version || 0) >= (serverEntity.version || 0)) {
      return {
        winningEntity: localEntity,
        isLocalWinner: true,
        reason: `VERSION_LOCAL_GREATER_OR_EQUAL (${localEntity.version} >= ${serverEntity.version})`
      };
    }

    return {
      winningEntity: serverEntity,
      isLocalWinner: false,
      reason: `VERSION_SERVER_GREATER (${serverEntity.version} > ${localEntity.version})`
    };
  }
}
