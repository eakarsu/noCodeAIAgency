const command = process.argv[2] || "unsafe command"
console.error(`Blocked ${command}. Use checked-in additive migrations and documented, explicitly acknowledged administration commands.`)
process.exit(78)
