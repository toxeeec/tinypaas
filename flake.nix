{
  inputs = {
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nub = {
      url = "github:nubjs/nub";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs = inputs @ {
    git-hooks,
    nixpkgs,
    ...
  }: let
    systems = ["aarch64-darwin" "aarch64-linux" "x86_64-linux"];
    forAllSystems = function:
      nixpkgs.lib.genAttrs systems (
        system: function system nixpkgs.legacyPackages.${system}
      );
  in {
    checks = forAllSystems (system: pkgs: let
      inherit (inputs.nub.packages.${system}) nub;
      inherit (import ./nix/nub.nix {inherit pkgs;}) fetchNubDeps nubConfigHook;
      nubDeps = fetchNubDeps {
        pname = "tinypaas";
        src = pkgs.lib.fileset.toSource {
          root = ./.;
          fileset = pkgs.lib.fileset.unions [
            ./package.json
            ./nub.lock
            ./.npmrc

            (pkgs.lib.fileset.fileFilter (
                file: file.name == "package.json"
              )
              ./packages)
          ];
        };
        inherit nub;
        hash = "sha256-akyS1cUT+Ij8YMuTb81g2bvhn1/Kaew1flIHqQsdhD4=";
      };
    in {
      check = pkgs.stdenvNoCC.mkDerivation {
        name = "check";
        src = ./.;
        inherit nubDeps;
        strictDeps = true;
        nativeBuildInputs = [pkgs.nodejs_26 nub nubConfigHook];
        buildPhase = ''
          runHook preBuild
          nub run check
          runHook postBuild
        '';
        installPhase = "touch $out";
      };
    });

    devShells = forAllSystems (system: pkgs: let
      inherit (inputs.nub.packages.${system}) nub;
      gitHooks = git-hooks.lib.${system}.run {
        src = ./.;
        package = pkgs.prek;
        hooks = {
          alejandra = {
            enable = true;
            settings.verbosity = "quiet";
          };
          check = {
            always_run = true;
            enable = true;
            entry = "nub run check";
            extraPackages = [nub];
            pass_filenames = false;
          };
          statix.enable = true;
        };
      };
    in {
      default = pkgs.mkShell {
        inherit (gitHooks) shellHook;
        packages =
          gitHooks.enabledPackages
          ++ [
            nub
            pkgs.nodejs_26
          ];
      };
    });
  };
}
