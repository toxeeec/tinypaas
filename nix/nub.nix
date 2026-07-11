{pkgs}: let
  fetchNubDeps = {
    hash,
    pname,
    src,
    nub,
  }:
    pkgs.runCommand "${pname}-nub-deps" {
      inherit src;
      impureEnvVars = pkgs.lib.fetchers.proxyImpureEnvVars;
      nativeBuildInputs = [pkgs.cacert pkgs.jq pkgs.moreutils nub pkgs.yq-go pkgs.zstd];
      outputHashMode = "recursive";
      outputHashAlgo = "sha256";
      outputHash = hash;
      strictDeps = true;
    } ''
      export HOME="$TMPDIR/home"
      export npm_config_store_dir="$TMPDIR/store"
      mkdir -p "$HOME" "$npm_config_store_dir" "$out"

      cd "$src"
      mapfile -t packages < <(yq -r '.packages | keys | .[]' nub.lock)
      nub store add "''${packages[@]}"

      storePath="$(nub store path)"
      while IFS= read -r -d "" index; do
        jq --sort-keys '
          map_values(
            .store_path = ("@NUB_STORE@/files/" + (.hex_hash[0:2]) + "/" + (.hex_hash[2:]))
          )
        ' "$index" | sponge "$index"
      done < <(find "$storePath/index" -type f -name '*.json' -print0)

      find "$storePath" -type f -name '*-exec' -exec chmod 555 {} +
      find "$storePath" -type f ! -name '*-exec' -exec chmod 444 {} +
      find "$storePath" -type d -exec chmod 555 {} +

      tar --sort=name \
        --mtime="@$SOURCE_DATE_EPOCH" \
        --owner=0 --group=0 --numeric-owner \
        --pax-option=exthdr.name=%d/PaxHeaders/%f,delete=atime,delete=ctime \
        --zstd -cf "$out/nub-store.tar.zst" -C "$npm_config_store_dir" .
    '';

  nubConfigHook =
    pkgs.makeSetupHook {
      name = "nub-config-hook";
      propagatedBuildInputs = [pkgs.jq pkgs.moreutils pkgs.zstd];
    }
    ./nub-config-hook.sh;
in {
  inherit fetchNubDeps nubConfigHook;
}
