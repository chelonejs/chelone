<script setup lang="ts">
import { SetPasswordPage } from "@chelone/vue/supabase";
import { useLocation, useNavigate } from "@chelone/vue";
import StubClient from "@/StubClient.vue";
import { onMounted } from "vue";

// The location as the demo opened, so a query or an anchor on the docs URL survives.
const opened = { ...useLocation().value };
const navigate = useNavigate();

// `<SetPasswordPage>` reads the tokens a recovery link carries off the URL. The
// preview is not at such a link, so this puts the tokens on the URL once; the
// form keeps them and removes them from the URL, as it does for a real link.
onMounted(() => {
  const { pathname, search, hash } = opened;
  const params = new URLSearchParams(search);
  params.set("access_token", "preview-access");
  params.set("refresh_token", "preview-refresh");
  params.set("type", "recovery");
  navigate(`${pathname}?${params.toString()}${hash}`, { replace: true });
});
</script>

<template>
  <!-- `<SetPasswordPage>` finishes a recovery link: two password fields and Save. `<StubClient>` stands in for the Supabase client, so saving sets no real password. -->
  <StubClient>
    <SetPasswordPage />
  </StubClient>
</template>
