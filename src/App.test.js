import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalletProvider, useWallet } from "./WalletContext";
import App from "./App";
import { fetchNFTs } from "./utils/soroban";

// Mock external dependencies
const mockLoadAccount = jest.fn();
jest.mock("@stellar/stellar-sdk", () => ({
  Networks: { TESTNET: "TESTNET" },
  rpc: { Server: class {} },
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: mockLoadAccount,
    })),
  },
  Contract: class {}, // Mock Contract class for soroban.js
}));

// Mock WalletModal to avoid rendering complex UI in tests
jest.mock("./WalletModal", () => () => <div>WalletModal</div>);

// Mock framer-motion to render children directly
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    section: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <div>{children}</div>,
}));

// Mock the NFT fetching utility
jest.mock("./utils/soroban", () => ({
  fetchNFTs: jest.fn(),
}));

// Mock the useWallet hook from the context
jest.mock("./WalletContext", () => ({
  ...jest.requireActual("./WalletContext"),
  useWallet: jest.fn(),
}));

beforeEach(() => {
  // Reset the mock before each test
  useWallet.mockReset();
  mockLoadAccount.mockReset();
  fetchNFTs.mockReset();
});

test("renders Stellar Payment dApp title (Logged Out)", () => {
  useWallet.mockReturnValue({
    walletAddress: "",
    setModalOpen: jest.fn(),
  });

  render(
    <MemoryRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </MemoryRouter>
  );

  const titleElement = screen.getByText(/Stellar Payment dApp/i);
  expect(titleElement).toBeInTheDocument();
});

test("renders navigation links (Logged In)", async () => {
  useWallet.mockReturnValue({
    walletAddress: "GTEST",
    setModalOpen: jest.fn(),
  });
  // Mock successful API calls
  mockLoadAccount.mockResolvedValue({
    balances: [{ asset_type: "native", balance: "123.45" }],
  });
  fetchNFTs.mockResolvedValue([]);

  render(
    <MemoryRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </MemoryRouter>
  );

  // Wait for the component to render after async operations in useEffect
  // Use `findAllByText` which handles waiting and multiple elements.
  const mintLinks = await screen.findAllByText(/Mint NFT/i);
  expect(mintLinks.length).toBeGreaterThan(0);

  const galleryLinks = await screen.findAllByText(/Gallery/i);
  expect(galleryLinks.length).toBeGreaterThan(0);
});

test("renders mint page heading", () => {
  useWallet.mockReturnValue({
    walletAddress: "GTEST",
    setModalOpen: jest.fn(),
  });
  mockLoadAccount.mockResolvedValue({
    balances: [{ asset_type: "native", balance: "123.45" }],
  });
  fetchNFTs.mockResolvedValue([]);

  render(
    <MemoryRouter initialEntries={["/mint"]}>
      <WalletProvider>
        <App />
      </WalletProvider>
    </MemoryRouter>
  );

  expect(screen.getByText(/Mint an NFT/i)).toBeInTheDocument();
});