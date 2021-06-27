import { SpreeError } from '@spree/storefront-api-v2-sdk/types/errors';
import { IToken } from '@spree/storefront-api-v2-sdk/types/interfaces/Token';
import { ApiContext, Cart } from '../../types';
import getCurrentBearerOrCartToken from '../authentication/getCurrentBearerOrCartToken';
import { deserializeCart } from '../serializers/cart';
import { defaultCartIncludes } from '../common/cart';

async function createCart({ client, config }: ApiContext, token: IToken): Promise<Cart> {
  const createCartResult = await client.cart.create(token, defaultCartIncludes);

  if (createCartResult.isSuccess()) {
    const payload = createCartResult.success();
    const cart = deserializeCart(payload.data, payload.included, config);

    const isGuestUser = !token.bearerToken;
    if (isGuestUser) {
      const newCartToken = payload.data.attributes.token;
      await config.auth.changeCartToken(newCartToken);
    }

    return cart;
  } else {
    throw createCartResult.fail();
  }
}

export default async function getCart({ client, config }: ApiContext): Promise<Cart> {
  const token = await getCurrentBearerOrCartToken({ client, config });
  const result = await client.cart.show(token, defaultCartIncludes);

  if (result.isSuccess()) {
    const payload = result.success();
    const cart = deserializeCart(payload.data, payload.included, config);

    return cart;
  } else {
    const error = result.fail() as SpreeError;
    const serverResponse = error.serverResponse;

    if (serverResponse && serverResponse.status === 404) {
      return await createCart({ client, config }, token);
    } else {
      throw result.fail();
    }
  }
}