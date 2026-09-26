export interface EnvironmentConfig {
  PORT: number;
  MONGODB_URI: string;
  OBSERVE_APP_KEY?: string;
  OBSERVE_APP_SECRET?: string;
}

export const envConfig = (): EnvironmentConfig => {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error(
      'Missing required environment variable: MONGODB_URI. Configure it in your .env file before starting the backend.',
    );
  }

  return {
    PORT: Number(process.env.PORT ?? 3000),
    MONGODB_URI: mongodbUri,
    OBSERVE_APP_KEY: process.env.OBSERVE_APP_KEY,
    OBSERVE_APP_SECRET: process.env.OBSERVE_APP_SECRET,
  };
};
