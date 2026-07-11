nubConfigHook() {
  echo "Executing nubConfigHook"

  if [ -z "${nubDeps-}" ]; then
    echo "Error: 'nubDeps' must be set when using nubConfigHook." >&2
    exit 1
  fi

  if ! command -v nub >/dev/null; then
    echo "Error: 'nub' not found in PATH." >&2
    exit 1
  fi

  export HOME="$TMPDIR/home"
  export npm_config_store_dir="$TMPDIR/store"
  mkdir -p "$HOME" "$npm_config_store_dir"

  tar --zstd -xf "$nubDeps/nub-store.tar.zst" -C "$npm_config_store_dir"
  chmod -R +w "$npm_config_store_dir"

  storePath="$(nub store path)"
  while IFS= read -r -d "" index; do
    jq --arg storePath "$storePath" '
      map_values(
        .store_path = ($storePath + "/files/" + (.hex_hash[0:2]) + "/" + (.hex_hash[2:]))
      )
    ' "$index" | sponge "$index"
  done < <(find "$storePath/index" -type f -name '*.json' -print0)

  nub install --offline --frozen-lockfile
  echo "Finished nubConfigHook"
}

postConfigureHooks+=(nubConfigHook)
