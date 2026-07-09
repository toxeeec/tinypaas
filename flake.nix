{
  inputs = {
    git-hooks.url = "github:cachix/git-hooks.nix";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nub.url = "github:nubjs/nub";
  };
  outputs = {
    self,
    git-hooks,
    nixpkgs,
    nub,
    ...
  }: let
    forAllSystems = function:
      nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
        system: function system nixpkgs.legacyPackages.${system}
      );
  in {
    formatter = forAllSystems (_system: pkgs: pkgs.alejandra);

    checks = forAllSystems (system: pkgs: {
      pre-commit-check = git-hooks.lib.${system}.run {
        src = ./.;
        package = pkgs.prek;

        hooks = {
          alejandra.enable = true;
          oxfmt = {
            enable = true;
            entry = "nub exec oxfmt";
            types_or = ["json" "ts"];
          };
          oxlint = {
            enable = true;
            entry = "nub exec oxlint";
            types_or = ["ts"];
          };
          statix.enable = true;
        };
      };
    });

    devShells = forAllSystems (system: pkgs: {
      default = let
        inherit (self.checks.${system}.pre-commit-check) shellHook enabledPackages;
      in
        pkgs.mkShell {
          inherit shellHook;
          packages =
            enabledPackages
            ++ [nub.packages.${system}.nub];
        };
    });
  };
}
