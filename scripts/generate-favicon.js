import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')
const inputPath = join(publicDir, 'app-icon.png')
const sizes = [16, 32, 48, 64]

async function main() {
  if (!existsSync(inputPath)) {
    console.error('public/app-icon.png not found. Add your icon there first.')
    process.exit(1)
  }
  const buffer = readFileSync(inputPath)
  for (const size of sizes) {
    const outPath = join(publicDir, `favicon-${size}.png`)
    await sharp(buffer)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png()
      .toFile(outPath)
    console.log(`Wrote ${outPath}`)
  }
  console.log('Favicons generated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
