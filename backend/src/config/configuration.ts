export interface AppConfig {
  env: string;
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || process.env.BACKEND_PORT || '5001', 10),
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
});
