/*
 * @Author: XY | The Findables Company <ryanxyo>
 * @Date:   Thursday, 13th September 2018 2:19:30 pm
 * @Email:  developer@xyfindables.com
 * @Filename: index.ts
 * @Last modified by: ryanxyo
 * @Last modified time: Friday, 21st September 2018 10:56:02 am
 * @License: All Rights Reserved
 * @Copyright: Copyright XY | The Findables Company
 */

import { XYOSerializer } from './xyo-serializer';
import { XyoObject } from '../components/xyo-object';
import { XyoError } from '../components/xyo-error';
import { XyoBase } from '../components/xyo-base';

/**
 * An XyoPacker is a central serializer/deserializer registry service.
 * This will allow classes to not worry about how they themselves are
 * represented in the xyo-packing protocol
 */
export class XyoPacker extends XyoBase {

  // tslint:disable-next-line:prefer-array-literal The collections serializer/deserializers
  private readonly serializerDeserializersCollection: Array<XYOSerializer<any>> = [];

  // An index from name to the index of the array in which the serializer/deserializer is located
  private readonly serializerDeserializersByNameIndex: {[s: string]: number } = {};

  // An index from [major][minor] to the index of the array in which the serializer/deserializer is located
  private readonly serializerDeserializerMajorMinorIndex: {[s: string]: {[s: string]: number } } = {};

  /**
   * Adds a serializer/deserializer. Serializer/Deserializers should conform to
   * the XYO spec of packing and unpacking objects
   *
   * @param name The name of class
   * @param serializerDeserializer An instance of a `XYOPackerSerializerDeserializer`
   */

  public registerSerializerDeserializer<T extends XyoObject>(
    name: string,
    serializerDeserializer: XYOSerializer<T>
  ) {
    /** Add to collection */
    this.serializerDeserializersCollection.push(serializerDeserializer);

    /** Add to the indexes */
    const index = this.serializerDeserializersCollection.length - 1;
    const { major, minor } = serializerDeserializer.description;
    this.serializerDeserializersByNameIndex[name] = index;
    this.serializerDeserializerMajorMinorIndex[major] = this.serializerDeserializerMajorMinorIndex[major] || {};
    this.serializerDeserializerMajorMinorIndex[major][minor] = index;
  }

  /**
   * Attempts to serialize an object to a buffer that meets the xyo-packing specification protocol
   *
   * @param object The object to serialize
   * @param major The major value of the object
   * @param minor The minor value of the object
   * @param typed true if typed, false if untyped, undefined for raw
   * @returns The Buffer representation of the xyo-object.
   *
   * @throws Will throw an `XyoError` of type `ERR_CREATOR_MAPPING` if a serializer can not be located
   */

  public serialize(object: XyoObject, major: number, minor: number, typed?: boolean): Buffer {
    if (this.serializerDeserializerMajorMinorIndex[major]) { // See if a major record exist

      // Check to see if a minor record exists. Assert typeof number since `0` is a valid value
      if (typeof this.serializerDeserializerMajorMinorIndex[major][minor] === 'number') {

        // Get index and assert the index is in range of the underlying data collection
        const index = this.serializerDeserializerMajorMinorIndex[major][minor];
        if (index < this.serializerDeserializersCollection.length) {
          // Attempt to serialize
          const serializer = this.serializerDeserializersCollection[index];
          const serialized = serializer.serialize(object, this);
          if (typed === undefined) {
            return serialized;
          }

          if (typed) {
            return this.makeTyped(serialized, serializer);
          }

          return this.makeUntyped(serialized, serializer);
        }
      }
    }

    throw new XyoError(
      `Could not find serializer for major ${major} and minor ${minor}`,
      XyoError.errorType.ERR_CREATOR_MAPPING
    );
  }

  public deserialize(buffer: Buffer): XyoObject {
    if (!buffer || buffer.length < 2) {
      throw new XyoError(`Unable to deserialize buffer`, XyoError.errorType.ERR_CREATOR_MAPPING);
    }

    const major = buffer[0];
    const minor = buffer[1];
    if (this.serializerDeserializerMajorMinorIndex[major]) { // See if a major record exist

      // Check to see if a minor record exists. Assert typeof number since `0` is a valid value
      if (typeof this.serializerDeserializerMajorMinorIndex[major][minor] === 'number') {

        // Get index and assert the index is in range of the underlying data collection
        const index = this.serializerDeserializerMajorMinorIndex[major][minor];
        if (index < this.serializerDeserializersCollection.length) {

          // Attempt to serialize
          try {
            const serializer = this.serializerDeserializersCollection[index];
            return serializer.deserialize(buffer.slice(2), this);
          } catch (err) {
            this.logError(`There was an attempting to deserialize an object with major ${major}, minor ${minor}`);
            throw err;
          }
        }
      }
    }

    throw new XyoError(
      `Could not find serializer for major ${major} and minor ${minor}`,
      XyoError.errorType.ERR_CREATOR_MAPPING
    );
  }

  public getMajor(name: string): number {
    const serializer = this.getSerializerByName(name);
    return serializer.description.major;
  }

  public getMinor(name: string): number | undefined {
    const serializer = this.getSerializerByName(name);
    return serializer.description.minor;
  }

  public getMajorMinor(name: string) {
    const serializer = this.getSerializerByName(name);

    return {
      major: serializer.description.major,
      minor: serializer.description.minor
    };
  }

  public getSerializerByMajorMinor(
    major: number,
    minor: number
  ): XYOSerializer<XyoObject> | undefined {
    const index = this.serializerDeserializerMajorMinorIndex[major][minor];
    if (index < this.serializerDeserializersCollection.length) {
      return this.serializerDeserializersCollection[index];
    }

    return undefined;
  }

  public getSerializerByName(name: string) {
    const serializerIndex = this.serializerDeserializersByNameIndex[name];
    if (serializerIndex === undefined || serializerIndex >= this.serializerDeserializersCollection.length) {
      throw new XyoError(`Unable to locate serializer ${name}`, XyoError.errorType.ERR_CREATOR_MAPPING);
    }

    return this.serializerDeserializersCollection[serializerIndex];
  }

  private makeTyped(data: Buffer, config: XYOSerializer<XyoObject>) {
    const encodedSizeBuffer = this.encodedSize(data.length, config);
    const dataBuffer = data || new Buffer(0);

    const typedBufferSize = config.id.length + encodedSizeBuffer.length + dataBuffer.length;

    const typedBuffer = Buffer.concat([
      config.id,
      encodedSizeBuffer,
      dataBuffer
    ], typedBufferSize);

    return typedBuffer;
  }

  private makeUntyped(data: Buffer, config: XYOSerializer<XyoObject>) {
    const encodedSizeBuffer = this.encodedSize(data.length, config);
    const dataBuffer = data || new Buffer(0);
    const typedBufferSize = encodedSizeBuffer.length + dataBuffer.length;

    const unTypedBuffer = Buffer.concat([
      encodedSizeBuffer,
      dataBuffer
    ], typedBufferSize);

    return unTypedBuffer;
  }

  private encodedSize(sizeOfData: number, config: XYOSerializer<XyoObject>) {
    if (!config.sizeOfBytesToRead) {
      return new Buffer(0);
    }

    const buffer = new Buffer(config.sizeOfBytesToRead || 0);

    switch (config.sizeOfBytesToRead) {
      case 1:
        buffer.writeUInt8(sizeOfData + (config.sizeOfBytesToRead || 0), 0);
        break;
      case 2:
        buffer.writeUInt16BE(sizeOfData + (config.sizeOfBytesToRead || 0), 0);
        break;
      case 4:
        buffer.writeUInt32BE(sizeOfData + (config.sizeOfBytesToRead || 0), 0);
        break;
    }

    return buffer;
  }
}
