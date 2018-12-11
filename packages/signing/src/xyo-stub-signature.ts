/*
 * @Author: XY | The Findables Company <ryanxyo>
 * @Date:   Thursday, 29th November 2018 4:46:25 pm
 * @Email:  developer@xyfindables.com
 * @Filename: xyo-stub-signature.ts
 * @Last modified by: ryanxyo
 * @Last modified time: Tuesday, 11th December 2018 9:29:16 am
 * @License: All Rights Reserved
 * @Copyright: Copyright XY | The Findables Company
 */

import { IXyoSignature, IXyoPublicKey } from "./@types"
import { parse, XyoBaseSerializable } from '@xyo-network/serialization'
import { schema } from "@xyo-network/serialization-schema"

export class XyoStubSignature extends XyoBaseSerializable  implements IXyoSignature {

  public static schemaObjectId = schema.stubSignature.id

  public static deserialize(data: Buffer): XyoStubSignature {
    const parsed = parse(data)
    return new XyoStubSignature((parsed.data as Buffer).toString('hex'))
  }

  public schemaObjectId = XyoStubSignature.schemaObjectId

  constructor (private readonly desiredSignatureHexString: string) {
    super()
  }

  public async verify(data: Buffer, publicKey: IXyoPublicKey): Promise<boolean> {
    return true
  }

  public get encodedSignature (): Buffer {
    return Buffer.from(this.desiredSignatureHexString, 'hex')
  }

  public getData(): Buffer {
    return this.encodedSignature
  }
}