/*
 * @Author: XY | The Findables Company <ryanxyo>
 * @Date:   Tuesday, 18th September 2018 10:58:24 am
 * @Email:  developer@xyfindables.com
 * @Filename: xyo-sha224-hash-provider.ts
 * @Last modified by: ryanxyo
 * @Last modified time: Tuesday, 18th September 2018 11:08:49 am
 * @License: All Rights Reserved
 * @Copyright: Copyright XY | The Findables Company
 */

import { XyoSha224Hash } from '../components/hashing/xyo-sha224-hash';
import { XyoNativeBaseHashProvider } from './xyo-native-base-hash-provider';

/**
 * Provides sha224 hash support
 */

export class XyoSha224HashProvider extends XyoNativeBaseHashProvider {

  /**
   * Creates a new instance of a XyoSha224HashProvider
   */

  constructor() {
    super('sha224', XyoSha224Hash);
  }
}
