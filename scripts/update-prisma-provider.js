const fs = require('fs');
const path = require('path');

// Read DB_PROVIDER from environment variables or .env file if needed
// Note: In a real Next.js app, .env is loaded by Next.js, but for this standalone script
// we might need to verify if specific loading is expected. 
// For simplicity in Vercel/Build envs, we expect process.env to be populated.
// If running locally, you might want to preload dotenv. 
// We will try to read .env file manually if process.env.DB_PROVIDER is not set,
// just to be helpful in local dev without strictly requiring `dotenv` package as a dependency if not already there.

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
        }
    } catch (e) {
        // Ignore error
    }
}

loadEnv();

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const provider = process.env.DB_PROVIDER || 'sqlite';

console.log(`Updating Prisma provider to: ${provider}`);

try {
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Regex to find the datasource block and replace the provider
    // Looks for datasource db { ... provider = "..." ... }
    const regex = /(datasource\s+db\s+\{[\s\S]*?provider\s*=\s*")([^"]+)("[\s\S]*?\})/;

    if (regex.test(schema)) {
        const currentProvider = schema.match(regex)[2];
        if (currentProvider !== provider) {
            const newSchema = schema.replace(regex, `$1${provider}$3`);
            fs.writeFileSync(schemaPath, newSchema);
            console.log(`Successfully updated provider from "${currentProvider}" to "${provider}"`);
        } else {
            console.log(`Provider is already set to "${provider}". No changes made.`);
        }
    } else {
        console.error('Could not find datasource db block in schema.prisma');
        process.exit(1);
    }
} catch (error) {
    console.error('Error updating schema.prisma:', error);
    process.exit(1);
}
