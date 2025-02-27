import sanityClient from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

export const client = sanityClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
  apiVersion: import.meta.env.VITE_SANITY_API_VERSION,
  token: "skUrcb5JjYhZqV2Rr7ILSRtbIasIjmX3XnCdzYg18LCm0S74iBk43oWT62CbAcjE9KspYwiLfW86lCfLdMtyiBWPfoihhnItW6eUJlBWKga89lSQbJ01z9mPsroL5V8Zs4j6ma59GwDgWMIUX1p2C5gC3swYtcrSbt3YcXUosNbO0Xh6tdIq",
  useCdn: true,
});

const builder = imageUrlBuilder(client);
export const urlFor = (source) => builder.image(source);
